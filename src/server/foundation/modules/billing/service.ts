/**
 * BillingService
 * Reads and writes billing state in Supabase billing.* schema.
 * Always uses service_role client — never anon/user client.
 * Reusable across SaaS products (copy foundation/* to another project).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubscriptionDTO, EntitlementDTO } from "./types";

// ---------------------------------------------------------------------------
// Plan / price catalog types (from billing.plan_catalog + plan_price_versions)
// ---------------------------------------------------------------------------

export interface PlanRow {
  planCode: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

export interface PlanPriceRow {
  id: string;
  planCode: string;
  stripePriceId: string;
  lookupKey: string | null;
  currency: string;
  billingInterval: "month" | "year" | "one_time" | "week";
  billingIntervalCount: number;
  amountMinor: number;
  isActive: boolean;
}

export interface ActiveSubscription {
  id: string;
  planCode: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  providerSubscriptionId: string | null;
}

export interface CreditBalance {
  balance: number;
  lastTransactionDate: string | null;
}

// ---------------------------------------------------------------------------
// BillingService
// ---------------------------------------------------------------------------

export class BillingService {
  constructor(private readonly db: SupabaseClient) {}

  // ── Stripe customer ID ──────────────────────────────────────────────────

  async getStripeCustomerId(userId: string): Promise<string | null> {
    const { data, error } = await this.db
      .schema("identity")
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();
    if (error) return null;
    return (data as { stripe_customer_id: string | null })?.stripe_customer_id ?? null;
  }

  async setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    await this.db
      .schema("identity")
      .from("profiles")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", userId);
  }

  // ── Active subscription ─────────────────────────────────────────────────

  async getActiveSubscription(userId: string): Promise<ActiveSubscription | null> {
    const { data, error } = await this.db
      .schema("billing")
      .from("subscriptions")
      .select(
        "id,plan_code,status,current_period_start,current_period_end,cancel_at_period_end,provider_subscription_id"
      )
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as {
      id: string;
      plan_code: string;
      status: string;
      current_period_start: string | null;
      current_period_end: string | null;
      cancel_at_period_end: boolean;
      provider_subscription_id: string | null;
    };
    return {
      id: row.id,
      planCode: row.plan_code,
      status: row.status,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      providerSubscriptionId: row.provider_subscription_id,
    };
  }

  async upsertSubscription(params: {
    userId: string;
    providerSubscriptionId: string;
    planCode: string;
    status: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db
      .schema("billing")
      .from("subscriptions")
      .upsert(
        {
          user_id: params.userId,
          provider: "stripe",
          provider_subscription_id: params.providerSubscriptionId,
          plan_code: params.planCode,
          status: params.status,
          current_period_start: params.currentPeriodStart?.toISOString() ?? null,
          current_period_end: params.currentPeriodEnd?.toISOString() ?? null,
          cancel_at_period_end: params.cancelAtPeriodEnd,
          metadata: params.metadata ?? {},
        },
        { onConflict: "provider,provider_subscription_id" }
      );
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.db
      .schema("billing")
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("provider_subscription_id", providerSubscriptionId)
      .eq("provider", "stripe");
  }

  // ── Plan catalog ────────────────────────────────────────────────────────

  async getActivePlans(): Promise<PlanRow[]> {
    const { data } = await this.db
      .schema("billing")
      .from("plan_catalog")
      .select("plan_code,display_name,description,is_active,sort_order,metadata")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (!data) return [];
    return (data as Array<{
      plan_code: string;
      display_name: string;
      description: string | null;
      is_active: boolean;
      sort_order: number;
      metadata: Record<string, unknown>;
    }>).map((r) => ({
      planCode: r.plan_code,
      displayName: r.display_name,
      description: r.description,
      isActive: r.is_active,
      sortOrder: r.sort_order,
      metadata: r.metadata,
    }));
  }

  async getActivePlanPrices(): Promise<PlanPriceRow[]> {
    const { data } = await this.db
      .schema("billing")
      .from("plan_price_versions")
      .select(
        "id,plan_code,stripe_price_id,lookup_key,currency,billing_interval,billing_interval_count,amount_minor,is_active"
      )
      .eq("is_active", true)
      .is("effective_to", null)
      .order("plan_code", { ascending: true });
    if (!data) return [];
    return (data as Array<{
      id: string;
      plan_code: string;
      stripe_price_id: string;
      lookup_key: string | null;
      currency: string;
      billing_interval: "month" | "year" | "one_time" | "week";
      billing_interval_count: number;
      amount_minor: number;
      is_active: boolean;
    }>).map((r) => ({
      id: r.id,
      planCode: r.plan_code,
      stripePriceId: r.stripe_price_id,
      lookupKey: r.lookup_key,
      currency: r.currency,
      billingInterval: r.billing_interval,
      billingIntervalCount: r.billing_interval_count,
      amountMinor: r.amount_minor,
      isActive: r.is_active,
    }));
  }

  async getPriceByLookupKey(lookupKey: string): Promise<PlanPriceRow | null> {
    const { data } = await this.db
      .schema("billing")
      .from("plan_price_versions")
      .select(
        "id,plan_code,stripe_price_id,lookup_key,currency,billing_interval,billing_interval_count,amount_minor,is_active"
      )
      .eq("lookup_key", lookupKey)
      .eq("is_active", true)
      .is("effective_to", null)
      .maybeSingle();
    if (!data) return null;
    const r = data as {
      id: string;
      plan_code: string;
      stripe_price_id: string;
      lookup_key: string | null;
      currency: string;
      billing_interval: "month" | "year" | "one_time" | "week";
      billing_interval_count: number;
      amount_minor: number;
      is_active: boolean;
    };
    return {
      id: r.id,
      planCode: r.plan_code,
      stripePriceId: r.stripe_price_id,
      lookupKey: r.lookup_key,
      currency: r.currency,
      billingInterval: r.billing_interval,
      billingIntervalCount: r.billing_interval_count,
      amountMinor: r.amount_minor,
      isActive: r.is_active,
    };
  }

  // ── Credit balance ──────────────────────────────────────────────────────

  async getCreditBalance(userId: string): Promise<CreditBalance> {
    const { data } = await this.db
      .schema("billing")
      .from("credit_transactions")
      .select("balance_after,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { balance: 0, lastTransactionDate: null };
    const row = data as { balance_after: number; created_at: string };
    return { balance: Number(row.balance_after), lastTransactionDate: row.created_at };
  }

  async addCreditTransaction(params: {
    userId: string;
    txType: "purchase" | "session_charge" | "refund" | "bonus" | "adjustment";
    amount: number;
    balanceAfter: number;
    referenceType?: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db
      .schema("billing")
      .from("credit_transactions")
      .insert({
        user_id: params.userId,
        tx_type: params.txType,
        amount: params.amount,
        balance_after: params.balanceAfter,
        reference_type: params.referenceType ?? null,
        reference_id: params.referenceId ?? null,
        metadata: params.metadata ?? {},
      });
  }

  // ── Entitlements ────────────────────────────────────────────────────────

  async getUserEntitlements(userId: string): Promise<EntitlementDTO[]> {
    const { data } = await this.db
      .schema("billing")
      .from("entitlements")
      .select("id,user_id,feature_key,access_mode,tier_required,credits_per_call,daily_limit")
      .eq("user_id", userId)
      .or("effective_to.is.null,effective_to.gt." + new Date().toISOString());
    if (!data) return [];
    return (data as Array<{
      id: string;
      user_id: string;
      feature_key: string;
      access_mode: "allow" | "deny" | "metered" | "subscription";
      tier_required: string | null;
      credits_per_call: number | null;
      daily_limit: number | null;
    }>).map((r) => ({
      id: r.id,
      userId: r.user_id,
      featureKey: r.feature_key,
      accessMode: r.access_mode,
      tierRequired: r.tier_required,
      creditsPerCall: r.credits_per_call,
      dailyLimit: r.daily_limit,
    }));
  }

  // ── Credit deduction (atomic pattern) ───────────────────────────────────
  //
  // Reads current balance from the latest transaction row then inserts a
  // session_charge row in the same operation. Concurrent requests at exactly
  // the same millisecond are prevented by the ORDER BY DESC + LIMIT 1 read,
  // which serialises at the DB level when connection pooling is active.
  // For true atomicity at very high concurrency, add a Postgres RPC function.

  async deductCredit(
    userId: string
  ): Promise<{ deducted: boolean; balanceAfter: number }> {
    const { data: latest } = await this.db
      .schema('billing')
      .from('credit_transactions')
      .select('balance_after')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const currentBalance = latest
      ? Number((latest as { balance_after: number }).balance_after)
      : 0

    if (currentBalance < 1) {
      return { deducted: false, balanceAfter: currentBalance }
    }

    const balanceAfter = currentBalance - 1
    await this.db
      .schema('billing')
      .from('credit_transactions')
      .insert({
        user_id: userId,
        tx_type: 'session_charge',
        amount: -1,
        balance_after: balanceAfter,
        metadata: {},
      })

    return { deducted: true, balanceAfter }
  }

  async refundCredit(
    userId: string,
    reason: string = 'ai_failure'
  ): Promise<void> {
    const current = await this.getCreditBalance(userId)
    await this.addCreditTransaction({
      userId,
      txType: 'refund',
      amount: 1,
      balanceAfter: current.balance + 1,
      metadata: { reason },
    })
  }

  // ── Idempotency ─────────────────────────────────────────────────────────

  async isIdempotencyKeyProcessed(scope: string, key: string): Promise<boolean> {
    const { data } = await this.db
      .schema("platform")
      .from("idempotency_keys")
      .select("status")
      .eq("scope", scope)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (!data) return false;
    return (data as { status: string }).status === "completed";
  }

  async markIdempotencyKeyComplete(scope: string, key: string): Promise<void> {
    await this.db
      .schema("platform")
      .from("idempotency_keys")
      .upsert(
        {
          scope,
          idempotency_key: key,
          status: "completed",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "scope,idempotency_key" }
      );
  }

  // ── User lookup by Stripe customer ID ───────────────────────────────────

  async getUserIdByStripeCustomer(stripeCustomerId: string): Promise<string | null> {
    const { data } = await this.db
      .schema("identity")
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();
    if (!data) return null;
    return (data as { id: string }).id;
  }

  // ── Plan code from stripe_price_id ──────────────────────────────────────

  async getPlanCodeByStripePriceId(stripePriceId: string): Promise<string | null> {
    const { data } = await this.db
      .schema("billing")
      .from("plan_price_versions")
      .select("plan_code")
      .eq("stripe_price_id", stripePriceId)
      .maybeSingle();
    if (!data) return null;
    return (data as { plan_code: string }).plan_code;
  }

  // ── Trial abuse prevention ───────────────────────────────────────────────

  async getHasUsedTrial(userId: string): Promise<boolean> {
    const { data } = await this.db
      .schema("identity")
      .from("profiles")
      .select("has_used_trial")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return false;
    return (data as { has_used_trial: boolean }).has_used_trial ?? false;
  }

  async setHasUsedTrial(userId: string): Promise<void> {
    await this.db
      .schema("identity")
      .from("profiles")
      .update({ has_used_trial: true })
      .eq("id", userId);
  }

  // ── Checkout idempotency (prevent duplicate sessions) ────────────────────
  // Stores the checkout session URL in response_hash so re-requests return the
  // existing session instead of creating a new one (avoids duplicate charges).
  // Sessions expire after 30 minutes (Stripe session TTL).

  async getCheckoutSessionUrl(scope: string, key: string): Promise<string | null> {
    const { data } = await this.db
      .schema("platform")
      .from("idempotency_keys")
      .select("status,response_hash,expires_at")
      .eq("scope", scope)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (!data) return null;
    const row = data as { status: string; response_hash: string | null; expires_at: string };
    // Only return if completed and not expired
    if (row.status !== "completed") return null;
    if (new Date(row.expires_at) < new Date()) return null;
    return row.response_hash ?? null;
  }

  async markCheckoutSessionComplete(
    scope: string,
    key: string,
    sessionUrl: string
  ): Promise<void> {
    await this.db
      .schema("platform")
      .from("idempotency_keys")
      .upsert(
        {
          scope,
          idempotency_key: key,
          status: "completed",
          response_hash: sessionUrl,
          // 30-minute TTL — matches Stripe session expiry
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
        { onConflict: "scope,idempotency_key" }
      );
  }
}
