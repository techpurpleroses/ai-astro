/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for subscription or credit-pack purchase.
 *
 * Body: { lookup_key: string, success_url?: string, cancel_url?: string, trial?: boolean }
 *   lookup_key examples: "astroai_pro_monthly_usd", "astroai_pro_yearly_usd", "astroai_credits_100_usd"
 *   trial: true → adds 3-day free trial (only if user has not used a trial before)
 *
 * Returns: { url: string }
 *
 * Idempotent: re-requests within 30 minutes return the same session URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type Stripe from "stripe";
import { getStripeClient } from "@/server/integrations/payments/stripe/client";
import { BillingService } from "@/server/foundation/modules/billing/service";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase/service-role-client";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";

export const runtime = "nodejs";

const TRIAL_PERIOD_DAYS = 3;

export async function POST(req: NextRequest) {
  // 1. Authenticate user
  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    lookup_key?: string;
    success_url?: string;
    cancel_url?: string;
    trial?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { lookup_key, success_url, cancel_url, trial = false } = body;
  if (!lookup_key) {
    return NextResponse.json({ error: "lookup_key is required" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const db = getServiceRoleSupabaseClient();
  const billing = new BillingService(db);

  // 3. Checkout idempotency — return existing session if one was recently created
  const idempotencyScope = "checkout";
  const idempotencyKey = `checkout:${user.id}:${lookup_key}`;
  const existingUrl = await billing.getCheckoutSessionUrl(idempotencyScope, idempotencyKey);
  if (existingUrl) {
    return NextResponse.json({ url: existingUrl });
  }

  // 4. Resolve price from DB
  const priceRow = await billing.getPriceByLookupKey(lookup_key);
  if (!priceRow) {
    return NextResponse.json(
      { error: `No active price found for lookup_key: ${lookup_key}` },
      { status: 404 }
    );
  }

  // 5. Get or create Stripe customer
  const stripe = getStripeClient();
  let stripeCustomerId = await billing.getStripeCustomerId(user.id);

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    stripeCustomerId = customer.id;
    await billing.setStripeCustomerId(user.id, stripeCustomerId);
  }

  // 6. Build checkout session params
  const isOneTime = priceRow.billingInterval === "one_time";
  const successUrl = success_url ?? `${appUrl}/settings?checkout=success`;
  const cancelUrl = cancel_url ?? `${appUrl}/settings/billing`;

  let sessionParams: Stripe.Checkout.SessionCreateParams;

  if (isOneTime) {
    sessionParams = {
      customer: stripeCustomerId,
      mode: "payment",
      line_items: [{ price: priceRow.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { lookup_key },
    };
  } else {
    // Subscription — check trial eligibility
    const trialEligible = trial && !(await billing.getHasUsedTrial(user.id));

    const subscriptionData: Record<string, unknown> = {
      metadata: { lookup_key, supabase_user_id: user.id },
    };
    if (trialEligible) {
      subscriptionData.trial_period_days = TRIAL_PERIOD_DAYS;
    }

    sessionParams = {
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceRow.stripePriceId, quantity: 1 }],
      subscription_data: subscriptionData,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    };
  }

  // 7. Create Stripe session
  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }

  // 8. Store session URL for idempotency (30-min TTL matching Stripe session)
  await billing.markCheckoutSessionComplete(idempotencyScope, idempotencyKey, session.url);

  return NextResponse.json({ url: session.url });
}
