import { NextRequest, NextResponse } from "next/server";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const logger = createServerLogger("api.auth.logout");

export async function POST(request: NextRequest) {
  return observeApiRoute({
    scope: "api.auth.logout.POST",
    request,
    handler: async () => {
      try {
        const supabase = await getServerSupabaseClient();
        await supabase.auth.signOut();
        return NextResponse.json({ ok: true });
      } catch (error) {
        logger.error("request.error", { error });
        // Even when Supabase signOut fails (e.g. outage), force-clear all sb-* auth
        // cookies from the browser. Without this, the middleware's getUser() still
        // sees a valid session and redirects the user away from /auth/login — making
        // it impossible to log out during a Supabase disruption.
        const response = NextResponse.json({ ok: true });
        for (const cookie of request.cookies.getAll()) {
          if (cookie.name.startsWith("sb-")) {
            response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
          }
        }
        return response;
      }
    },
  });
}
