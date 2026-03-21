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

        const [subjectResult, profileResult] = await Promise.all([
          serviceSupabase
            .schema("identity")
            .from("subjects")
            .select("id, birth_date, birth_time, birth_place_name, is_placeholder, personalization_timezone, birth_timezone")
            .eq("user_id", userId)
            .eq("is_primary", true)
            .maybeSingle(),
          serviceSupabase
            .schema("identity")
            .from("profiles")
            .select("display_name, gender, relationship_status")
            .eq("id", userId)
            .maybeSingle(),
        ]);

        const subject = subjectResult.data as {
          id: string | null;
          birth_date: string | null;
          birth_time: string | null;
          birth_place_name: string | null;
          is_placeholder: boolean | null;
          personalization_timezone: string | null;
          birth_timezone: string | null;
        } | null;

        const profile = profileResult.data as {
          display_name: string | null;
          gender: string | null;
          relationship_status: string | null;
        } | null;

        const isPlaceholder = subject?.is_placeholder ?? true;
        const birthDate = subject?.birth_date ?? null;
        const sunSign = birthDate && !isPlaceholder ? getSunSign(birthDate) : null;

        // Trim seconds from birth_time (HH:MM:SS → HH:MM)
        const rawTime = subject?.birth_time ?? null;
        const birthTime = rawTime ? rawTime.substring(0, 5) : null;

        return NextResponse.json({
          userId,
          subjectId: subject?.id ?? null,
          isPlaceholder,
          sunSign,
          timezone: subject?.personalization_timezone ?? "UTC",
          displayName: profile?.display_name ?? null,
          gender: profile?.gender ?? null,
          relationshipStatus: profile?.relationship_status ?? null,
          birthDate,
          birthTime,
          birthPlaceName: subject?.birth_place_name ?? null,
        });
      } catch (error) {
        logger.error("request.error", { error });
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    },
  });
}

// ── PATCH /api/dashboard/profile ─────────────────────────────────────────────
// Updates profile fields. Accepted fields:
//   displayName, gender, relationshipStatus (→ identity.profiles)
//   birthDate, birthTime, birthTimezone, birthPlaceName (→ identity.subjects)

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
          displayName?: string;
          gender?: string;
          relationshipStatus?: string;
          birthDate?: string;
          birthTime?: string;
          birthTimezone?: string;
          birthPlaceName?: string;
        };

        const serviceSupabase = getServiceRoleSupabaseClient();
        const now = new Date().toISOString();

        // ── Update identity.profiles (name, gender, relationship) ────────────
        const profileUpdate: Record<string, unknown> = { updated_at: now };
        if (body.displayName !== undefined) {
          if (body.displayName.trim().length < 1) {
            return NextResponse.json({ error: "displayName cannot be empty" }, { status: 400 });
          }
          profileUpdate.display_name = body.displayName.trim();
        }
        if (body.gender !== undefined) {
          const valid = ["female", "male", "non_binary"];
          if (!valid.includes(body.gender)) {
            return NextResponse.json({ error: "invalid gender value" }, { status: 400 });
          }
          profileUpdate.gender = body.gender;
        }
        if (body.relationshipStatus !== undefined) {
          const valid = ["single", "engaged", "married", "soulmate", "difficult"];
          if (!valid.includes(body.relationshipStatus)) {
            return NextResponse.json({ error: "invalid relationshipStatus value" }, { status: 400 });
          }
          profileUpdate.relationship_status = body.relationshipStatus;
        }

        if (Object.keys(profileUpdate).length > 1) {
          const { error: profileErr } = await serviceSupabase
            .schema("identity")
            .from("profiles")
            .update(profileUpdate)
            .eq("id", userId);
          if (profileErr) {
            logger.warn("request.profile_update_failed", { userId, message: profileErr.message });
            return NextResponse.json({ error: "update_failed", detail: profileErr.message }, { status: 500 });
          }
        }

        // ── Update identity.subjects (birth data) ───────────────────────────
        if (body.birthDate !== undefined) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)) {
            return NextResponse.json({ error: "birthDate must be YYYY-MM-DD" }, { status: 400 });
          }
          const parsed = new Date(body.birthDate);
          if (isNaN(parsed.getTime()) || parsed > new Date()) {
            return NextResponse.json({ error: "birthDate is invalid or in the future" }, { status: 400 });
          }

          const subjectUpdate: Record<string, unknown> = {
            birth_date: body.birthDate,
            is_placeholder: false,
            updated_at: now,
          };
          if (body.birthTime !== undefined) subjectUpdate.birth_time = body.birthTime;
          if (body.birthTimezone !== undefined) {
            subjectUpdate.birth_timezone = body.birthTimezone;
            subjectUpdate.personalization_timezone = body.birthTimezone;
          }
          if (body.birthPlaceName !== undefined) subjectUpdate.birth_place_name = body.birthPlaceName;

          const { error: subjectErr } = await serviceSupabase
            .schema("identity")
            .from("subjects")
            .update(subjectUpdate)
            .eq("user_id", userId)
            .eq("is_primary", true);

          if (subjectErr) {
            logger.warn("request.subject_update_failed", { userId, message: subjectErr.message });
            return NextResponse.json({ error: "update_failed", detail: subjectErr.message }, { status: 500 });
          }
        } else if (body.birthTime !== undefined || body.birthPlaceName !== undefined) {
          // Update time/place without requiring birthDate
          const subjectUpdate: Record<string, unknown> = { updated_at: now };
          if (body.birthTime !== undefined) subjectUpdate.birth_time = body.birthTime;
          if (body.birthPlaceName !== undefined) subjectUpdate.birth_place_name = body.birthPlaceName;
          if (body.birthTimezone !== undefined) {
            subjectUpdate.birth_timezone = body.birthTimezone;
            subjectUpdate.personalization_timezone = body.birthTimezone;
          }

          const { error: subjectErr } = await serviceSupabase
            .schema("identity")
            .from("subjects")
            .update(subjectUpdate)
            .eq("user_id", userId)
            .eq("is_primary", true);

          if (subjectErr) {
            logger.warn("request.subject_update_failed", { userId, message: subjectErr.message });
            return NextResponse.json({ error: "update_failed", detail: subjectErr.message }, { status: 500 });
          }
        }

        return NextResponse.json({ ok: true });
      } catch (error) {
        logger.error("request.error", { error });
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    },
  });
}
