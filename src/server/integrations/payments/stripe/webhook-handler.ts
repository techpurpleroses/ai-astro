/**
 * Stripe webhook event handler.
 * Idempotent — each event is processed at most once via platform.idempotency_keys.
 * Uses service_role client only.
 */

import type Stripe from "stripe";
import { revalidateTag } from "next/cache";
import { BillingService } from "@/server/foundation/modules/billing/service";

// Credit amounts awarded for credit-pack purchases (lookup_key → credit count)
const CREDIT_PACK_LOOKUP_KEYS: Record<string, number> = {
  astroai_credits_50_usd: 50,
  astroai_credits_100_usd: 100,
  astroai_credits_200_usd: 200,
};

export class StripeWebhookHandler {
  constructor(private readonly billing: BillingService) {}

  async handle(event: Stripe.Event): Promise<{ processed: boolean; reason?: string }> {
    const idempotencyKey = event.id;
    const scope = "stripe_webhook";

    // Skip if already processed
    if (await this.billing.isIdempotencyKeyProcessed(scope, idempotencyKey)) {
      return { processed: false, reason: "already_processed" };
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
          break;

        case "customer.subscription.created":
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case "customer.subscription.updated":
          await this.handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
          break;

        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case "invoice.payment_succeeded":
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case "invoice.payment_failed":
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          // Unhandled event type — still mark as processed to avoid requeue spam
          break;
      }

      await this.billing.markIdempotencyKeyComplete(scope, idempotencyKey);
      return { processed: true };
    } catch (err) {
      // Do NOT mark complete — let Stripe retry
      throw err;
    }
  }

  // ── Event handlers ──────────────────────────────────────────────────────

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const customerId = typeof session.customer === "string" ? session.customer : null;
    if (!customerId) return;

    const userId = await this.billing.getUserIdByStripeCustomer(customerId);
    if (!userId) return;

    // One-time credit pack purchase
    if (session.mode === "payment") {
      const lookupKey = session.metadata?.lookup_key ?? "";
      const creditCount = CREDIT_PACK_LOOKUP_KEYS[lookupKey] ?? 0;
      if (creditCount > 0) {
        const current = await this.billing.getCreditBalance(userId);
        const balanceAfter = current.balance + creditCount;
        await this.billing.addCreditTransaction({
          userId,
          txType: "purchase",
          amount: creditCount,
          balanceAfter,
          referenceType: "stripe_checkout_session",
          referenceId: undefined,
          metadata: { session_id: session.id, lookup_key: lookupKey },
        });
      }
      return;
    }

    // Subscription checkout — subscription events will also fire, so nothing extra here
  }

  private async handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
    const customerId = typeof sub.customer === "string" ? sub.customer : null;
    if (!customerId) return;

    const userId = await this.billing.getUserIdByStripeCustomer(customerId);
    if (!userId) return;

    // Stripe v20: current_period_start/end moved to SubscriptionItem
    const firstItem = sub.items.data[0];
    const stripePriceId = firstItem?.price?.id ?? "";
    const planCode = stripePriceId
      ? (await this.billing.getPlanCodeByStripePriceId(stripePriceId)) ?? "pro"
      : "pro";

    // Period dates are on the subscription item in Stripe v20
    const periodStart = firstItem?.current_period_start ?? null;
    const periodEnd = firstItem?.current_period_end ?? null;

    await this.billing.upsertSubscription({
      userId,
      providerSubscriptionId: sub.id,
      planCode,
      status: sub.status,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      metadata: { stripe_customer_id: customerId },
    });

    // Bust the entitlement cache so next request gets fresh plan state
    revalidateTag(`sub:${userId}`, 'max');

    // Grant Premium credits when Premium sub starts/renews
    if (planCode === "premium" && sub.status === "active") {
      const current = await this.billing.getCreditBalance(userId);
      const monthlyBonus = 50;
      // Only grant if no transaction in this billing period
      const periodStartIso = periodStart ? new Date(periodStart * 1000).toISOString() : null;
      if (
        !current.lastTransactionDate ||
        (periodStartIso && current.lastTransactionDate < periodStartIso)
      ) {
        await this.billing.addCreditTransaction({
          userId,
          txType: "bonus",
          amount: monthlyBonus,
          balanceAfter: current.balance + monthlyBonus,
          referenceType: "stripe_subscription",
          metadata: { subscription_id: sub.id, reason: "premium_monthly_credits" },
        });
      }
    }
  }

  private async handleSubscriptionCreated(sub: Stripe.Subscription): Promise<void> {
    // First, sync the subscription state (same as updated)
    await this.handleSubscriptionUpsert(sub);

    // Then mark trial as used — prevents trial abuse on future checkouts.
    // Fire regardless of whether this specific sub has a trial; if the user
    // created a subscription at all, they've opted in and are no longer eligible.
    const customerId = typeof sub.customer === "string" ? sub.customer : null;
    if (customerId) {
      const userId = await this.billing.getUserIdByStripeCustomer(customerId);
      if (userId) {
        await this.billing.setHasUsedTrial(userId);
      }
    }
  }

  private async handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
    await this.billing.cancelSubscription(sub.id);
    // Bust cache for affected user — look up by customer
    const customerId = typeof sub.customer === "string" ? sub.customer : null;
    if (customerId) {
      const userId = await this.billing.getUserIdByStripeCustomer(customerId);
      if (userId) revalidateTag(`sub:${userId}`, 'max');
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Subscription period update is handled by subscription.updated event
    // This event is a no-op unless we need to record payments
    void invoice;
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Stripe v20: subscription is nested in invoice.parent.subscription_details.subscription
    const subDetails = invoice.parent?.type === "subscription_details"
      ? (invoice.parent as { type: string; subscription_details: { subscription: string | null } | null })
          .subscription_details
      : null;
    const subId = subDetails?.subscription ?? null;
    if (!subId) return;

    // Mark subscription past_due — the subscription.updated event will also fire
    // This is a belt-and-suspenders update
    await this.billing.upsertSubscription({
      userId: "", // Will be resolved by subscription.updated event
      providerSubscriptionId: subId,
      planCode: "pro",
      status: "past_due",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      metadata: { failed_invoice_id: invoice.id },
    }).catch(() => {
      // Ignore if userId is empty — subscription.updated will fix it
    });
  }
}
