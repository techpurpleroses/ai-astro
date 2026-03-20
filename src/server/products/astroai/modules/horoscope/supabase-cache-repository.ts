import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import type { HoroscopeCacheRepository } from "./service";
import type { HoroscopeCategoryDTO, HoroscopeDTO, HoroscopeQuery } from "./types";

const CATEGORIES = ["your-day", "love", "health", "career"] as const;

type CategoryKey = (typeof CATEGORIES)[number];

interface MainRow {
  fact_date: string;
  title: string;
  text: string;
  energy: number | null;
  emotional_tone: string | null;
  challenges: unknown;
  opportunities: unknown;
  computed_at: string;
  expires_at: string | null;
  freshness_status: string;
  provider_meta: Record<string, unknown> | null;
}

interface CatRow {
  category: string;
  text: string;
  rating: number | null;
  keywords: unknown;
}

function toFreshnessStatus(expiresAt: string | null, now: Date): "fresh" | "stale" | "expired" {
  if (!expiresAt) return "fresh";
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.valueOf())) return "fresh";
  return parsed > now ? "fresh" : "expired";
}

function toSourceProvider(meta: Record<string, unknown> | null): string | null {
  const value = meta?.source_provider;
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function defaultCategory(): HoroscopeCategoryDTO {
  return { text: "", rating: 3, keywords: [] };
}

function buildCategoriesMap(rows: CatRow[]): HoroscopeDTO["categories"] {
  const map: Record<string, HoroscopeCategoryDTO> = {};
  for (const row of rows) {
    map[row.category] = {
      text: row.text,
      rating: row.rating ?? 3,
      keywords: asStringArray(row.keywords),
    };
  }
  return {
    "your-day": map["your-day"] ?? defaultCategory(),
    love: map["love"] ?? defaultCategory(),
    health: map["health"] ?? defaultCategory(),
    career: map["career"] ?? defaultCategory(),
  };
}

type CacheEntry = {
  data: HoroscopeDTO;
  sourceProvider: string | null;
  computedAt: string | null;
  expiresAt: string | null;
};

export class SupabaseHoroscopeCacheRepository implements HoroscopeCacheRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private async loadByQuery(query: HoroscopeQuery): Promise<CacheEntry | null> {
    const { data: mainData, error: mainError } = await this.supabase
      .schema("astro_artifacts")
      .from("daily_horoscope_artifacts")
      .select(
        "fact_date, title, text, energy, emotional_tone, challenges, opportunities, computed_at, expires_at, freshness_status, provider_meta"
      )
      .eq("fact_date", query.date)
      .eq("system_type", query.systemType)
      .eq("sign", query.sign.toLowerCase())
      .eq("contract_version", "v1")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mainError) {
      throw new Error(`Failed loading daily_horoscope_artifacts: ${mainError.message}`);
    }
    if (!mainData) return null;

    const main = mainData as MainRow;

    const { data: catData, error: catError } = await this.supabase
      .schema("astro_artifacts")
      .from("daily_category_horoscope_artifacts")
      .select("category, text, rating, keywords")
      .eq("fact_date", query.date)
      .eq("system_type", query.systemType)
      .eq("sign", query.sign.toLowerCase())
      .eq("contract_version", "v1");

    if (catError) {
      throw new Error(`Failed loading daily_category_horoscope_artifacts: ${catError.message}`);
    }

    const dto: HoroscopeDTO = {
      main: {
        date: main.fact_date,
        title: main.title,
        text: main.text,
        energy: main.energy ?? 50,
        emotionalTone: main.emotional_tone ?? "neutral",
        challenges: asStringArray(main.challenges),
        opportunities: asStringArray(main.opportunities),
      },
      categories: buildCategoriesMap((catData as CatRow[] | null) ?? []),
    };

    return {
      data: dto,
      sourceProvider: toSourceProvider(main.provider_meta),
      computedAt: main.computed_at ?? null,
      expiresAt: main.expires_at,
    };
  }

  async getFresh(query: HoroscopeQuery, now: Date): Promise<CacheEntry | null> {
    const logger = createServerLogger("astroai.horoscope.cache-repository");
    const startedAt = Date.now();
    const cached = await this.loadByQuery(query);
    const fresh = cached && toFreshnessStatus(cached.expiresAt, now) === "fresh" ? cached : null;
    logger.info("getFresh.complete", {
      durationMs: durationMs(startedAt),
      outcome: fresh ? "hit" : "miss",
      sign: query.sign,
      date: query.date,
      systemType: query.systemType,
      sourceProvider: fresh?.sourceProvider ?? cached?.sourceProvider ?? null,
    });
    return fresh;
  }

  async getStale(query: HoroscopeQuery): Promise<CacheEntry | null> {
    const logger = createServerLogger("astroai.horoscope.cache-repository");
    const startedAt = Date.now();
    const cached = await this.loadByQuery(query);
    logger.info("getStale.complete", {
      durationMs: durationMs(startedAt),
      outcome: cached ? "hit" : "miss",
      sign: query.sign,
      date: query.date,
      systemType: query.systemType,
      sourceProvider: cached?.sourceProvider ?? null,
    });
    return cached;
  }

  async save(query: HoroscopeQuery, entry: CacheEntry): Promise<void> {
    const logger = createServerLogger("astroai.horoscope.cache-repository");
    const startedAt = Date.now();
    const now = new Date();
    const computedAt = entry.computedAt ?? now.toISOString();
    const freshnessStatus = toFreshnessStatus(entry.expiresAt, now);
    const sign = query.sign.toLowerCase();

    const { error: mainError } = await this.supabase
      .schema("astro_artifacts")
      .from("daily_horoscope_artifacts")
      .upsert(
        {
          fact_date: query.date,
          system_type: query.systemType,
          sign,
          title: entry.data.main.title,
          text: entry.data.main.text,
          energy: entry.data.main.energy,
          emotional_tone: entry.data.main.emotionalTone,
          challenges: entry.data.main.challenges,
          opportunities: entry.data.main.opportunities,
          mapper_version: "v1",
          contract_version: "v1",
          computed_at: computedAt,
          expires_at: entry.expiresAt,
          freshness_status: freshnessStatus,
          provider_meta: { source_provider: entry.sourceProvider },
        },
        { onConflict: "fact_date,system_type,sign,contract_version" }
      );

    if (mainError) {
      throw new Error(`Failed saving daily_horoscope_artifacts: ${mainError.message}`);
    }

    for (const category of CATEGORIES) {
      const cat: HoroscopeCategoryDTO = entry.data.categories[category];
      const { error: catError } = await this.supabase
        .schema("astro_artifacts")
        .from("daily_category_horoscope_artifacts")
        .upsert(
          {
            fact_date: query.date,
            system_type: query.systemType,
            sign,
            category,
            text: cat.text,
            rating: cat.rating,
            keywords: cat.keywords,
            mapper_version: "v1",
            contract_version: "v1",
            computed_at: computedAt,
            expires_at: entry.expiresAt,
            freshness_status: freshnessStatus,
            provider_meta: { source_provider: entry.sourceProvider },
          },
          { onConflict: "fact_date,system_type,sign,category,contract_version" }
        );

      if (catError) {
        throw new Error(`Failed saving daily_category_horoscope_artifacts (${category}): ${catError.message}`);
      }
    }
    logger.info("save.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      sign: query.sign,
      date: query.date,
      systemType: query.systemType,
      sourceProvider: entry.sourceProvider,
    });
  }
}
