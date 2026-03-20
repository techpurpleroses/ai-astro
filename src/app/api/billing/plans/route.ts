/**
 * GET /api/billing/plans
 * Returns all active plans and their prices from the DB.
 * Public route — no auth required (used to render pricing page).
 *
 * Response: { plans: PlanRow[], prices: PlanPriceRow[] }
 */

import { NextResponse } from "next/server";
import { BillingService } from "@/server/foundation/modules/billing/service";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase/service-role-client";

export const runtime = "nodejs";
// Cache for 1 hour — plan catalog changes rarely
export const revalidate = 3600;

export async function GET() {
  const db = getServiceRoleSupabaseClient();
  const billing = new BillingService(db);

  const [plans, prices] = await Promise.all([
    billing.getActivePlans(),
    billing.getActivePlanPrices(),
  ]);

  return NextResponse.json({ plans, prices });
}
