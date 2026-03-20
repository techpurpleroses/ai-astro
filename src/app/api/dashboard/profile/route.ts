import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase";

export const runtime = "nodejs";
const logger = createServerLogger("api.dashboard.profile");

function getSunSign(birthDate: string): string {
  const date = new Date(birthDate);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "aquarius";
  return "pisces";
}

export async function GET(request: NextRequest) {
  return observeApiRoute({
    scope: "api.dashboard.profile.GET",
    request,
    handler: async () => {
      try {
        const supabase = await getServerSupabaseClient();
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;

        if (!userId) {
          logger.warn("request.unauthorized");
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const serviceSupabase = getServiceRoleSupabaseClient();
        const { data: subjectData } = await serviceSupabase
          .schema("identity")
          .from("subjects")
          .select("birth_date, is_placeholder, personalization_timezone, birth_timezone")
          .eq("user_id", userId)
          .eq("is_primary", true)
          .maybeSingle();

        const subject = subjectData as {
          birth_date: string | null;
          is_placeholder: boolean | null;
          personalization_timezone: string | null;
          birth_timezone: string | null;
        } | null;

        const isPlaceholder = subject?.is_placeholder ?? true;
        const birthDate = subject?.birth_date ?? null;
        const sunSign = birthDate && !isPlaceholder ? getSunSign(birthDate) : null;

        logger.info("request.success_meta", {
          userId,
          isPlaceholder,
          hasBirthDate: Boolean(birthDate),
          hasTimezone: Boolean(subject?.personalization_timezone),
        });
        return NextResponse.json({
          userId,
          isPlaceholder,
          sunSign,
          timezone: subject?.personalization_timezone ?? "UTC",
        });
      } catch (error) {
        logger.error("request.error", { error });
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    },
  });
}

// ── PATCH /api/dashboard/profile ─────────────────────────────────────────────
// Updates the user's primary subject birth data and clears is_placeholder.
// Body: { birthDate: "YYYY-MM-DD", birthTime?: "HH:MM", birthTimezone?: string, birthPlaceName?: string }

export async function PATCH(request: NextRequest) {
  return observeApiRoute({
    scope: "api.dashboard.profile.PATCH",
    request,
    handler: async () => {
      try {
        const supabase = await getServerSupabaseClient();
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;

        if (!userId) {
          logger.warn("request.unauthorized");
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const body = await request.json() as {
          birthDate?: string;
          birthTime?: string;
          birthTimezone?: string;
          birthPlaceName?: string;
        };

        const { birthDate, birthTime, birthTimezone, birthPlaceName } = body;
        logger.info("request.validated", {
          userId,
          birthDate,
          hasBirthTime: Boolean(birthTime),
          hasBirthTimezone: Boolean(birthTimezone),
          hasBirthPlaceName: Boolean(birthPlaceName),
        });

        if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
          return NextResponse.json({ error: "birthDate is required (YYYY-MM-DD)" }, { status: 400 });
        }

        const parsed = new Date(birthDate);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ error: "birthDate is not a valid date" }, { status: 400 });
        }

        if (parsed > new Date()) {
          return NextResponse.json({ error: "birthDate cannot be in the future" }, { status: 400 });
        }

        const serviceSupabase = getServiceRoleSupabaseClient();
        const { error } = await serviceSupabase
          .schema("identity")
          .from("subjects")
          .update({
            birth_date: birthDate,
            birth_time: birthTime ?? "12:00:00",
            birth_timezone: birthTimezone ?? "UTC",
            birth_place_name: birthPlaceName ?? null,
            is_placeholder: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("is_primary", true);

        if (error) {
          logger.warn("request.update_failed", { userId, message: error.message });
          return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
        }

        const sunSign = getSunSign(birthDate);
        return NextResponse.json({
          userId,
          isPlaceholder: false,
          sunSign,
          timezone: birthTimezone ?? "UTC",
        });
      } catch (error) {
        logger.error("request.error", { error });
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    },
  });
}
