/**
 * /settings/billing
 * Server component — fetches subscription state and plan catalog server-side.
 * Subscription state is stored in Supabase (not localStorage) so it's
 * always correct across devices, browsers, and new sign-ins.
 */

import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { BillingService } from "@/server/foundation/modules/billing/service";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase/service-role-client";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";
import { PricingPage } from "@/components/billing/pricing-page";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  // 1. Resolve authenticated user (server-side, works on any device)
  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated: redirect to login with return URL
  if (!user) {
    redirect("/auth/login?next=/settings/billing");
  }

  // 2. Fetch billing state + plan catalog (both via service role — no RLS restrictions)
  const db = getServiceRoleSupabaseClient();
  const billing = new BillingService(db);

  const [subscription, credits, plans, prices, hasUsedTrial] = await Promise.all([
    billing.getActiveSubscription(user.id),
    billing.getCreditBalance(user.id),
    billing.getActivePlans(),
    billing.getActivePlanPrices(),
    billing.getHasUsedTrial(user.id),
  ]);

  // 3. Render pricing page — all state comes from DB (cross-device accurate)
  return (
    <PricingPage
      plans={plans}
      prices={prices}
      subscription={subscription}
      creditBalance={credits.balance}
      hasUsedTrial={hasUsedTrial}
    />
  );
}
