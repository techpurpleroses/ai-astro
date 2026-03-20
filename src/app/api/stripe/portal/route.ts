/**
 * POST /api/stripe/portal
 * Creates a Stripe Billing Portal session for managing subscriptions.
 *
 * Body: { return_url?: string }
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getStripeClient } from "@/server/integrations/payments/stripe/client";
import { BillingService } from "@/server/foundation/modules/billing/service";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase/service-role-client";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";

export const runtime = "nodejs";

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

  // 2. Get Stripe customer ID
  const db = getServiceRoleSupabaseClient();
  const billing = new BillingService(db);
  const stripeCustomerId = await billing.getStripeCustomerId(user.id);

  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer found. Please subscribe first." },
      { status: 404 }
    );
  }

  // 3. Parse return URL
  let body: { return_url?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const returnUrl = body.return_url ?? `${appUrl}/settings/billing`;

  // 4. Create portal session
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: session.url });
}
