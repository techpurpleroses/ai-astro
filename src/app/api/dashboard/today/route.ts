import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getObservabilityTraceId } from "@/server/foundation/observability/context";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";
import type { TodayDTO } from "@/server/products/astroai/modules/today/types";
import type { HoroscopeDTO } from "@/server/products/astroai/modules/horoscope/types";

export const runtime = "nodejs";
const logger = createServerLogger("api.dashboard.today");

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getLocalDate(timezone: string): string {
  try {
    // en-CA locale formats as YYYY-MM-DD natively
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

type SectionStatus = "ok" | "stale" | "error" | "skipped";

interface TodaySection {
  data: TodayDTO | null;
  source: string | null;
  status: SectionStatus;
  computedAt: string | null;
  expiresAt: string | null;
}

interface HoroscopeSection {
  data: HoroscopeDTO | null;
  source: string | null;
  status: SectionStatus;
  computedAt: string | null;
}

interface CompatibilitySection {
  bestMatches: string[];
  todaysMatches: Array<{ sign1: string; sign2: string; score: number; note: string }>;
  status: SectionStatus;
}

export interface TodayScreenDTO {
  subject: {
    sunSign: string | null;
    localDate: string;
    timezone: string;
  };
  sections: {
    today: TodaySection;
    horoscope: HoroscopeSection;
    compatibility: CompatibilitySection;
  };
  meta: {
    contractVersion: string;
    traceId: string;
    generatedAt: string;
  };
}

// ── Compatibility fetch (best matches + today's love pairs) ───────────────────

async function fetchCompatibilitySection(
  sign: string | null
): Promise<CompatibilitySection> {
  if (!sign) return { bestMatches: [], todaysMatches: [], status: "skipped" };
  try {
    const supabase = getServiceRoleSupabaseClient();
    const [bestRes, loveRes] = await Promise.all([
      supabase
        .schema("astro_core")
        .from("compatibility_facts")
        .select("sign_b, overall")
        .eq("sign_a", sign)
        .eq("system_type", "western")
        .eq("contract_version", "v1")
        .order("overall", { ascending: false })
        .limit(4),
      supabase
        .schema("astro_core")
        .from("compatibility_facts")
        .select("sign_a, sign_b, love, summary")
        .eq("system_type", "western")
        .eq("contract_version", "v1")
        .order("love", { ascending: false })
        .limit(3),
    ]);

    if (bestRes.error || loveRes.error) {
      logger.warn("compatibility.query_error", {
        bestError: bestRes.error?.message,
        loveError: loveRes.error?.message,
      });
      return { bestMatches: [], todaysMatches: [], status: "error" };
    }

    const bestMatches = (bestRes.data ?? []).map(
      (r: { sign_b: string }) => r.sign_b
    );
    const todaysMatches = (loveRes.data ?? []).map(
      (r: { sign_a: string; sign_b: string; love: number; summary: string }) => ({
        sign1: r.sign_a,
        sign2: r.sign_b,
        score: r.love,
        note: r.summary ?? "",
      })
    );

    // If no data in the table yet (not seeded), return skipped — not an error
    if (bestMatches.length === 0 && todaysMatches.length === 0) {
      return { bestMatches: [], todaysMatches: [], status: "skipped" };
    }

    return { bestMatches, todaysMatches, status: "ok" };
  } catch (err) {
    logger.warn("compatibility.fetch_error", { err });
    return { bestMatches: [], todaysMatches: [], status: "error" };
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  return observeApiRoute({
    scope: "api.dashboard.today.GET",
    request: req,
    handler: async () => {
      const traceId =
        req.nextUrl.searchParams.get("traceId") ??
        getObservabilityTraceId() ??
        randomUUID();

      // ── 1. Auth ────────────────────────────────────────────────────────────
      const supabase = await getServerSupabaseClient();
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) {
        logger.warn("request.unauthorized");
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }

      // ── 2. Subject context ─────────────────────────────────────────────────
      const serviceSupabase = getServiceRoleSupabaseClient();
      const subjectResult = await serviceSupabase
        .schema("identity")
        .from("subjects")
        .select("birth_date, is_placeholder, personalization_timezone")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .maybeSingle();

      const subject = subjectResult.data as {
        birth_date: string | null;
        is_placeholder: boolean | null;
        personalization_timezone: string | null;
      } | null;

      const isPlaceholder = subject?.is_placeholder ?? true;
      const birthDate = subject?.birth_date ?? null;
      const sunSign =
        birthDate && !isPlaceholder ? getSunSign(birthDate) : null;
      const timezone = subject?.personalization_timezone ?? "UTC";
      const localDate = getLocalDate(timezone);

      logger.info("subject.resolved", { sunSign, localDate, timezone });

      // ── 3. Parallel section fetches with per-section error isolation ───────
      const { todayService, horoscopeService } = getAstroAiRuntime();

      const [todayResult, horoscopeResult, compatibilityResult] =
        await Promise.allSettled([
          todayService.getToday({
            date: localDate,
            systemType: "western",
            traceId,
          }),
          sunSign
            ? horoscopeService.getHoroscope({
                date: localDate,
                systemType: "western",
                sign: sunSign,
                traceId,
              })
            : Promise.resolve(null),
          fetchCompatibilitySection(sunSign),
        ]);

      // ── 4. Map results to per-section status ───────────────────────────────
      const todaySection: TodaySection =
        todayResult.status === "fulfilled"
          ? {
              data: todayResult.value.data,
              source: todayResult.value.meta.sourceProvider,
              status:
                todayResult.value.meta.freshnessStatus === "fresh"
                  ? "ok"
                  : "stale",
              computedAt: todayResult.value.meta.computedAt,
              expiresAt: null,
            }
          : {
              data: null,
              source: null,
              status: "error",
              computedAt: null,
              expiresAt: null,
            };

      const horoscopeSection: HoroscopeSection = (() => {
        if (!sunSign) {
          return { data: null, source: null, status: "skipped", computedAt: null };
        }
        if (horoscopeResult.status === "rejected") {
          return { data: null, source: null, status: "error", computedAt: null };
        }
        const val = horoscopeResult.value;
        if (!val) {
          return { data: null, source: null, status: "skipped", computedAt: null };
        }
        return {
          data: val.data,
          source: val.meta.sourceProvider,
          status: val.meta.freshnessStatus === "fresh" ? "ok" : "stale",
          computedAt: val.meta.computedAt,
        };
      })();

      const compatibilitySection: CompatibilitySection =
        compatibilityResult.status === "fulfilled"
          ? compatibilityResult.value
          : { bestMatches: [], todaysMatches: [], status: "error" };

      // ── 5. Compose response ────────────────────────────────────────────────
      const response: TodayScreenDTO = {
        subject: { sunSign, localDate, timezone },
        sections: {
          today: todaySection,
          horoscope: horoscopeSection,
          compatibility: compatibilitySection,
        },
        meta: {
          contractVersion: "v1",
          traceId,
          generatedAt: new Date().toISOString(),
        },
      };

      logger.info("response.composed", {
        todayStatus: todaySection.status,
        horoscopeStatus: horoscopeSection.status,
        compatibilityStatus: compatibilitySection.status,
        sunSign,
        localDate,
      });

      return NextResponse.json(response, { status: 200 });
    },
  });
}
