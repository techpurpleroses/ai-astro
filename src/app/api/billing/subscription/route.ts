/**
 * GET /api/billing/subscription
 * Returns the authenticated user's current subscription status + credit balance.
 *
 * Response: { subscription: ActiveSubscription | null, credits: CreditBalance }
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { BillingService } from "@/server/foundation/modules/billing/service";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase/service-role-client";
import { getSupabaseUrl, getSupabaseAnonKey } from "@/lib/supabase/env";

export const runtime = "nodejs";

export async function GET() {
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

  const db = getServiceRoleSupabaseClient();
  const billing = new BillingService(db);

  const [subscription, credits] = await Promise.all([
    billing.getActiveSubscription(user.id),
    billing.getCreditBalance(user.id),
  ]);

  return NextResponse.json({ subscription, credits });
}
