import type { SupabaseClient } from "@supabase/supabase-js";
import { BRAND_NAME } from "@/lib/brand";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import { AstrologyApiIoClient } from "../../../integrations/astrology/astrology-api-io-client";
import type {
  BirthChartProviderGateway,
  BirthChartQuery,
} from "../modules/birth-chart/service";
import type { BirthChartDTO } from "../modules/birth-chart/types";
import type {
  CompatibilityProviderGateway,
  CompatibilityQuery,
} from "../modules/compatibility/service";
import type { CompatibilityDTO } from "../modules/compatibility/types";
import type { HoroscopeProviderGateway } from "../modules/horoscope/service";
import type { HoroscopeCategoryDTO, HoroscopeDTO, HoroscopeQuery } from "../modules/horoscope/types";
import type { TodayProviderGateway } from "../modules/today/service";
import type { TodayDTO } from "../modules/today/types";

type JsonRecord = Record<string, unknown>;

const SIGN_FULL_NAMES: Record<string, string> = {
  ari: "Aries",
  aries: "Aries",
  tau: "Taurus",
  taurus: "Taurus",
  gem: "Gemini",
  gemini: "Gemini",
  can: "Cancer",
  cancer: "Cancer",
  leo: "Leo",
  vir: "Virgo",
  virgo: "Virgo",
  lib: "Libra",
  libra: "Libra",
  sco: "Scorpio",
  scorpio: "Scorpio",
  sag: "Sagittarius",
  sagittarius: "Sagittarius",
  cap: "Capricorn",
  capricorn: "Capricorn",
  aqu: "Aquarius",
  aquarius: "Aquarius",
  pis: "Pisces",
  pisces: "Pisces",
};

const SIGN_ANCHORS: Record<string, { month: number; day: number }> = {
  aries: { month: 4, day: 10 },
  taurus: { month: 5, day: 10 },
  gemini: { month: 6, day: 10 },
  cancer: { month: 7, day: 10 },
  leo: { month: 8, day: 10 },
  virgo: { month: 9, day: 10 },
  libra: { month: 10, day: 10 },
  scorpio: { month: 11, day: 10 },
  sagittarius: { month: 12, day: 10 },
  capricorn: { month: 1, day: 10 },
  aquarius: { month: 2, day: 10 },
  pisces: { month: 3, day: 10 },
};

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPath(value: unknown, path: string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    const obj = asRecord(current);
    if (!obj) return undefined;
    current = obj[key];
  }
  return current;
}

function unwrapData(payload: unknown): JsonRecord {
  const root = asRecord(payload) ?? {};
  const inner = asRecord(root.data);
  return inner ?? root;
}

function normalizeSign(input: string): string {
  return input.toLowerCase().replace(/[^a-z]/g, "");
}

function fullSignName(input: string | null): string | null {
  if (!input) return null;
  return SIGN_FULL_NAMES[normalizeSign(input)] ?? input;
}

function systemToZodiacType(systemType: string): "Tropic" | "Sidereal" {
  return systemType === "vedic" || systemType === "indian_lunar" || systemType === "indian_solar"
    ? "Sidereal"
    : "Tropic";
}

function buildGlobalDateContext(inputDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = inputDate.split("-").map((part) => Number(part));
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part) && part > 0)) {
    return {
      year: parts[0],
      month: parts[1],
      day: parts[2],
    };
  }
  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
}

function toIsoDateTime(value: unknown, fallbackDate: string): string {
  const asText = asString(value);
  if (asText) {
    const parsed = new Date(asText);
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
  }
  return `${fallbackDate}T00:00:00.000Z`;
}

function normalizeSignificance(value: unknown): "low" | "medium" | "high" {
  const text = asString(value)?.toLowerCase() ?? "medium";
  if (text === "low" || text === "medium" || text === "high") return text;
  if (text.includes("major") || text.includes("strong")) return "high";
  if (text.includes("minor")) return "low";
  return "medium";
}

interface SubjectRow {
  label: string | null;
  birth_date: string;
  birth_time: string | null;
  birth_place_name: string | null;
  latitude: number | null;
  longitude: number | null;
}

function splitBirthDate(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    throw new Error(`Invalid subject birth_date: ${date}`);
  }
  return { year, month, day };
}

function splitBirthTime(time: string | null): { hour: number; minute: number; second: number } {
  if (!time) return { hour: 12, minute: 0, second: 0 };
  const [hour, minute, second] = time.split(":").map((part) => Number(part));
  return {
    hour: Number.isFinite(hour) ? hour : 12,
    minute: Number.isFinite(minute) ? minute : 0,
    second: Number.isFinite(second) ? second : 0,
  };
}

function extractCity(place: string | null): string {
  if (!place) return "London";
  return place.split(",")[0]?.trim() || "London";
}

function extractCountryCode(place: string | null): string {
  if (!place) return "GB";
  const segments = place
    .split(",")
    .map((segment) => segment.trim().toUpperCase())
    .filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && /^[A-Z]{2}$/.test(last)) return last;
  return "GB";
}

function buildCompatibilitySubject(sign: string, label: string): JsonRecord {
  const normalized = normalizeSign(sign);
  const full = SIGN_FULL_NAMES[normalized] ?? "Aries";
  const anchor = SIGN_ANCHORS[normalizeSign(full)] ?? SIGN_ANCHORS.aries;
  return {
    name: `${label} (${full})`,
    birth_data: {
      year: 1990,
      month: anchor.month,
      day: anchor.day,
      hour: 12,
      minute: 0,
      second: 0,
      city: "London",
      country_code: "GB",
    },
  };
}

function mapTodayTransits(aspectsPayload: unknown): TodayDTO["transits"] {
  const data = unwrapData(aspectsPayload);
  const rawAspects = asArray(data.aspects);
  return rawAspects.slice(0, 20).map((item) => {
    const row = asRecord(item) ?? {};
    const transitingPlanet = asString(row.point1) ?? "Unknown";
    const targetPlanet = asString(row.point2);
    const aspectType = asString(row.aspect_type);
    return {
      title:
        asString(row.title) ??
        (targetPlanet ? `${transitingPlanet} ${aspectType ?? "aspect"} ${targetPlanet}` : null),
      transitingPlanet,
      targetPlanet,
      aspectType,
      interpretation: asString(row.interpretation),
    };
  });
}

function mapTodayEvents(eventsPayload: unknown, date: string): TodayDTO["events"] {
  const data = unwrapData(eventsPayload);
  const currentEvents = asArray(data.current_events);
  const upcomingEvents = asArray(data.upcoming_events);
  const merged = [...currentEvents, ...upcomingEvents].slice(0, 25);

  return merged
    .map((item) => {
      const row = asRecord(item) ?? {};
      const title = asString(row.title) ?? asString(row.name) ?? asString(row.event) ?? "Lunar Event";
      const eventType = asString(row.event_type) ?? asString(row.type) ?? "lunar_event";
      const eventAt = toIsoDateTime(row.event_at ?? row.time ?? row.date, date);
      const significance = normalizeSignificance(row.significance ?? row.importance);
      return { title, eventType, significance, eventAt };
    })
    .sort((a, b) => a.eventAt.localeCompare(b.eventAt));
}

function scoreFromDynamics(
  overall: number,
  dynamics: JsonRecord | null
): Pick<CompatibilityDTO, "love" | "career" | "friendship" | "sex"> {
  const harmony = asNumber(dynamics?.harmony_percentage) ?? clamp(overall * 2, 0, 100);
  const tension = asNumber(dynamics?.tension_percentage) ?? clamp(100 - harmony, 0, 100);

  return {
    love: clamp(Math.round(harmony), 0, 100),
    friendship: clamp(Math.round((harmony + overall) / 2), 0, 100),
    career: clamp(Math.round((overall + (100 - tension)) / 2), 0, 100),
    sex: clamp(Math.round(harmony * 0.9 + (100 - tension) * 0.1), 0, 100),
  };
}

export class AstrologyApiIoAstroAiGateway
  implements TodayProviderGateway, CompatibilityProviderGateway, BirthChartProviderGateway, HoroscopeProviderGateway
{
  private readonly logger = createServerLogger("astroai.provider.astrology-api-io");

  constructor(
    private readonly client: AstrologyApiIoClient,
    private readonly supabase: SupabaseClient
  ) {}

  async fetchToday(query: { date: string; systemType: string }): Promise<{
    data: TodayDTO;
    sourceProvider: string;
    ttlSeconds?: number;
    computedAt?: string;
  }> {
    const startedAt = Date.now();
    this.logger.info("fetchToday.start", query);
    const dateCtx = buildGlobalDateContext(query.date);
    const zodiacType = systemToZodiacType(query.systemType);

    const lunarBody: JsonRecord = {
      subject: {
        name: `${BRAND_NAME} Daily Context`,
        birth_data: {
          year: dateCtx.year,
          month: dateCtx.month,
          day: dateCtx.day,
          hour: 12,
          minute: 0,
          second: 0,
          city: "Greenwich",
          country_code: "GB",
        },
      },
      options: {
        house_system: "P",
        zodiac_type: zodiacType,
        language: "en",
      },
    };

    const aspectsBody: JsonRecord = {
      subject: {
        name: `${BRAND_NAME} Daily Aspects`,
        birth_data: {
          year: 1990,
          month: dateCtx.month,
          day: dateCtx.day,
          hour: 12,
          minute: 0,
          second: 0,
          city: "London",
          country_code: "GB",
        },
      },
      options: {
        house_system: "P",
        zodiac_type: zodiacType,
        active_points: ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"],
        precision: 2,
      },
    };

    const eventsBody: JsonRecord = {
      datetime_location: {
        year: dateCtx.year,
        month: dateCtx.month,
        day: dateCtx.day,
        hour: 0,
        minute: 0,
        second: 0,
        city: "Greenwich",
        country_code: "GB",
      },
      days_ahead: 7,
    };

    const [moonResp, aspectsResp, eventsResp] = await Promise.all([
      this.client.getLunarMetrics(lunarBody),
      this.client.getAspects(aspectsBody),
      this.client.getLunarEvents(eventsBody),
    ]);

    const moonData = unwrapData(moonResp.data);
    const moon = {
      phaseName: asString(moonData.moon_phase) ?? "Unknown",
      illuminationPct: clamp(Math.round(asNumber(moonData.moon_illumination) ?? 0), 0, 100),
      sign: fullSignName(asString(moonData.moon_sign)),
    };

    const today: TodayDTO = {
      moon,
      transits: mapTodayTransits(aspectsResp.data),
      events: mapTodayEvents(eventsResp.data, query.date),
    };

    const result = {
      data: today,
      sourceProvider: "astrology_api_io",
      ttlSeconds: 6 * 60 * 60,
      computedAt: new Date().toISOString(),
    };
    this.logger.info("fetchToday.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      transits: today.transits.length,
      events: today.events.length,
      sourceProvider: result.sourceProvider,
    });
    return result;
  }

  async fetchCompatibility(query: CompatibilityQuery): Promise<{
    data: CompatibilityDTO;
    sourceProvider: string;
    ttlSeconds?: number;
    computedAt?: string;
  }> {
    const startedAt = Date.now();
    this.logger.info("fetchCompatibility.start", query);
    const payload = {
      subject1: buildCompatibilitySubject(query.signA, "Subject A"),
      subject2: buildCompatibilitySubject(query.signB, "Subject B"),
      options: {
        house_system: "P",
        zodiac_type: systemToZodiacType(query.systemType),
        active_points: ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"],
        precision: 2,
      },
      report_options: {
        include_details: true,
        language: "en",
      },
    };

    const response = await this.client.getCompatibilityScore(payload);
    const data = unwrapData(response.data);

    const overall = clamp(Math.round(asNumber(data.score) ?? 50), 0, 100);
    const dynamics = asRecord(data.dynamics);
    const breakdown = scoreFromDynamics(overall, dynamics);

    const strengths = asArray(dynamics?.key_strengths).map((item) => String(item)).slice(0, 8);
    const challenges = asArray(dynamics?.growth_areas).map((item) => String(item)).slice(0, 8);

    const dto: CompatibilityDTO = {
      signA: fullSignName(query.signA) ?? query.signA,
      signB: fullSignName(query.signB) ?? query.signB,
      overall,
      love: breakdown.love,
      career: breakdown.career,
      friendship: breakdown.friendship,
      sex: breakdown.sex,
      summary:
        asString(dynamics?.summary) ??
        asString(data.score_description) ??
        "Compatibility generated from astrology provider data.",
      strengths,
      challenges,
    };

    const result = {
      data: dto,
      sourceProvider: "astrology_api_io",
      ttlSeconds: 30 * 24 * 60 * 60,
      computedAt: new Date().toISOString(),
    };
    this.logger.info("fetchCompatibility.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      overall: dto.overall,
      strengths: dto.strengths.length,
      challenges: dto.challenges.length,
    });
    return result;
  }

  private async loadSubject(query: BirthChartQuery): Promise<SubjectRow> {
    const startedAt = Date.now();
    const { data, error } = await this.supabase
      .schema("identity")
      .from("subjects")
      .select("label, birth_date, birth_time, birth_place_name, latitude, longitude")
      .eq("id", query.subjectId)
      .eq("user_id", query.userId)
      .maybeSingle();

    if (error) {
      this.logger.error("loadSubject.error", {
        durationMs: durationMs(startedAt),
        userId: query.userId,
        subjectId: query.subjectId,
        error,
      });
      throw new Error(`Failed to load subject ${query.subjectId}: ${error.message}`);
    }
    if (!data) {
      this.logger.warn("loadSubject.not_found", {
        durationMs: durationMs(startedAt),
        userId: query.userId,
        subjectId: query.subjectId,
      });
      throw new Error(`Subject ${query.subjectId} not found for user ${query.userId}.`);
    }
    this.logger.info("loadSubject.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      userId: query.userId,
      subjectId: query.subjectId,
    });
    return data as SubjectRow;
  }

  async fetchBirthChart(query: BirthChartQuery): Promise<{
    data: BirthChartDTO;
    sourceProvider: string;
    ttlSeconds?: number;
    computedAt?: string;
  }> {
    const startedAt = Date.now();
    this.logger.info("fetchBirthChart.start", {
      userId: query.userId,
      subjectId: query.subjectId,
      chartType: query.chartType,
      systemType: query.systemType,
    });
    const subject = await this.loadSubject(query);
    const dateParts = splitBirthDate(subject.birth_date);
    const timeParts = splitBirthTime(subject.birth_time);
    const city = extractCity(subject.birth_place_name);
    const countryCode = extractCountryCode(subject.birth_place_name);

    const birthData: JsonRecord = {
      year: dateParts.year,
      month: dateParts.month,
      day: dateParts.day,
      hour: timeParts.hour,
      minute: timeParts.minute,
      second: timeParts.second,
      city,
      country_code: countryCode,
    };
    if (typeof subject.longitude === "number") {
      birthData.lng = subject.longitude;
    }
    if (typeof subject.latitude === "number") {
      birthData.lat = subject.latitude;
    }

    const response = await this.client.getNatalChart({
      subject: {
        name: subject.label ?? "Subject",
        birth_data: birthData,
      },
      options: {
        house_system: "P",
        zodiac_type: systemToZodiacType(query.systemType),
        active_points: ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"],
        precision: 2,
      },
    });

    const payload = asRecord(response.data) ?? {};
    const chartData = asRecord(payload.chart_data) ?? {};
    const subjectData = asRecord(payload.subject_data) ?? {};
    const bodies = asArray(chartData.planetary_positions).map((item) => asRecord(item) ?? {});
    const houses = asArray(chartData.house_cusps).map((item) => asRecord(item) ?? {});
    const aspects = asArray(chartData.aspects).map((item) => asRecord(item) ?? {});

    const sunSign =
      fullSignName(asString(getPath(subjectData, ["sun", "sign"]))) ??
      fullSignName(
        asString((bodies.find((item) => normalizeSign(asString(item.name) ?? "") === "sun") ?? {}).sign)
      ) ??
      "Unknown";
    const moonSign =
      fullSignName(asString(getPath(subjectData, ["moon", "sign"]))) ??
      fullSignName(
        asString((bodies.find((item) => normalizeSign(asString(item.name) ?? "") === "moon") ?? {}).sign)
      );
    const risingSign =
      fullSignName(asString(getPath(subjectData, ["ascendant", "sign"]))) ??
      fullSignName(asString((houses[0] ?? {}).sign));

    const dto: BirthChartDTO = {
      chartType: query.chartType,
      systemType: query.systemType,
      zodiacType:
        asString(subjectData.zodiac_type)?.toLowerCase() === "sidereal" ? "sidereal" : "tropical",
      houseSystem: asString(subjectData.houses_system_identifier) ?? "placidus",
      sunSign,
      moonSign,
      risingSign,
      bodies,
      houses,
      aspects,
    };

    const result = {
      data: dto,
      sourceProvider: "astrology_api_io",
      ttlSeconds: 180 * 24 * 60 * 60,
      computedAt: new Date().toISOString(),
    };
    this.logger.info("fetchBirthChart.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      bodies: dto.bodies.length,
      houses: dto.houses.length,
      aspects: dto.aspects.length,
      sunSign: dto.sunSign,
    });
    return result;
  }

  async fetchHoroscope(query: HoroscopeQuery): Promise<{
    data: HoroscopeDTO;
    sourceProvider: string;
    ttlSeconds?: number;
    computedAt?: string;
  }> {
    const startedAt = Date.now();
    this.logger.info("fetchHoroscope.start", query);
    const dateCtx = buildGlobalDateContext(query.date);
    const zodiacType = systemToZodiacType(query.systemType);
    const sign = normalizeSign(query.sign);

    const response = await this.client.getHoroscopeSignDailyText({
      sign,
      date: { year: dateCtx.year, month: dateCtx.month, day: dateCtx.day },
      options: { zodiac_type: zodiacType, language: "en" },
    });

    const payload = asRecord(response.data) ?? {};
    const inner = asRecord(payload.data) ?? payload;

    const text =
      asString(inner.horoscope_text) ??
      asString(inner.description) ??
      asString(inner.text) ??
      "The stars offer gentle guidance today.";

    const title =
      asString(inner.title) ??
      `${SIGN_FULL_NAMES[sign] ?? query.sign} Daily Horoscope`;

    const rawEnergy = asNumber(inner.energy) ?? asNumber(inner.energy_score);
    const energy = rawEnergy != null ? Math.round(Math.min(100, Math.max(0, rawEnergy))) : 60;

    const emotionalTone =
      asString(inner.emotional_tone) ?? asString(inner.tone) ?? "balanced";

    const challenges = asArray(inner.challenges)
      .map((item) => asString(item))
      .filter((item): item is string => item !== null)
      .slice(0, 5);

    const opportunities = asArray(inner.opportunities)
      .map((item) => asString(item))
      .filter((item): item is string => item !== null)
      .slice(0, 5);

    function makeCategory(key: string): HoroscopeCategoryDTO {
      const catData = asRecord(inner[key] ?? inner[`${key}_horoscope`]);
      const catText =
        (catData ? asString(catData.text) ?? asString(catData.description) : null) ??
        text;
      const catRating = catData ? Math.round(Math.min(5, Math.max(1, asNumber(catData.rating) ?? 3))) : 3;
      const catKeywords = catData
        ? asArray(catData.keywords)
            .map((item) => asString(item))
            .filter((item): item is string => item !== null)
        : [];
      return { text: catText, rating: catRating, keywords: catKeywords };
    }

    const dto: HoroscopeDTO = {
      main: {
        date: query.date,
        title,
        text,
        energy,
        emotionalTone,
        challenges,
        opportunities,
      },
      categories: {
        "your-day": makeCategory("your_day"),
        love: makeCategory("love"),
        health: makeCategory("health"),
        career: makeCategory("career"),
      },
    };

    const result = {
      data: dto,
      sourceProvider: "astrology_api_io",
      ttlSeconds: 24 * 60 * 60,
      computedAt: new Date().toISOString(),
    };
    this.logger.info("fetchHoroscope.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      sign: query.sign,
      date: query.date,
      challenges: dto.main.challenges.length,
      opportunities: dto.main.opportunities.length,
    });
    return result;
  }
}
