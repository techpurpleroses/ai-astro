/**
 * POST /api/stripe/webhook
 * Receives Stripe events. Verifies signature, then delegates to StripeWebhookHandler.
 * This route must be excluded from CSRF/body-parsing middleware.
 * Stripe requires the raw request body for signature verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, getStripeWebhookSecret } from "@/server/integrations/payments/stripe/client";
import { StripeWebhookHandler } from "@/server/integrations/payments/stripe/webhook-handler";
import { BillingService } from "@/server/foundation/modules/billing/service";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase/service-role-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  // Read raw body (required for signature verification)
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const db = getServiceRoleSupabaseClient();
    const billing = new BillingService(db);
    const handler = new StripeWebhookHandler(billing);

    const result = await handler.handle(event);

    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    console.error("[stripe/webhook] Error:", message, { event_id: event.id, type: event.type });
    // Return 500 so Stripe retries the event
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
