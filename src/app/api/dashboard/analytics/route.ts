import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase";

export const runtime = "nodejs";
const logger = createServerLogger("api.dashboard.analytics");

interface AnalyticsEventBody {
  type: string;
  properties?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  return observeApiRoute({
    scope: "api.dashboard.analytics.POST",
    request: req,
    handler: async () => {
      try {
        const supabase = await getServerSupabaseClient();
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;

        if (!userId) {
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const body = (await req.json()) as AnalyticsEventBody;

        if (!body.type || typeof body.type !== "string") {
          return NextResponse.json(
            { error: "invalid_request", detail: "type is required" },
            { status: 400 }
          );
        }

        const serviceSupabase = getServiceRoleSupabaseClient();
        const { error } = await serviceSupabase
          .schema("platform")
          .from("analytics_events")
          .insert({
            user_id: userId,
            event_type: body.type,
            properties: body.properties ?? {},
            occurred_at: new Date().toISOString(),
          });

        if (error) {
          logger.warn("analytics.insert_error", { message: error.message, type: body.type });
          // Fail silently — analytics must never break the UI
          return NextResponse.json({ ok: true });
        }

        logger.info("analytics.recorded", { type: body.type, userId });
        return NextResponse.json({ ok: true });
      } catch (err) {
        // Analytics errors are always silent — return 200 so UI is unaffected
        logger.warn("analytics.error", { err });
        return NextResponse.json({ ok: true });
      }
    },
  });
}
