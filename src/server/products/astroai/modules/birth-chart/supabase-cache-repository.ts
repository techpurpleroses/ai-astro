import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import type { BirthChartCacheRepository, BirthChartQuery } from "./service";
import type { BirthChartDTO } from "./types";

interface ChartSnapshotRow {
  chart_type: string;
  system_type: string;
  zodiac_type: string;
  house_system: string;
  sun_sign: string;
  moon_sign: string | null;
  rising_sign: string | null;
  bodies_json: Array<Record<string, unknown>>;
  houses_json: Array<Record<string, unknown>>;
  aspects_json: Array<Record<string, unknown>>;
  computed_at: string;
  expires_at: string | null;
  provider_meta: Record<string, unknown> | null;
}

function toSourceProvider(meta: Record<string, unknown> | null): string | null {
  const value = meta?.source_provider;
  return typeof value === "string" ? value : null;
}

function toFreshnessStatus(
  expiresAt: string | null,
  now: Date
): "fresh" | "stale" | "expired" {
  if (!expiresAt) return "fresh";
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.valueOf())) return "fresh";
  return parsed > now ? "fresh" : "expired";
}

export class SupabaseBirthChartCacheRepository implements BirthChartCacheRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private async loadLatest(query: BirthChartQuery): Promise<{
    data: BirthChartDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null> {
    const selectResult = await this.supabase
      .schema("astro_core")
      .from("chart_snapshots")
      .select(
        "chart_type, system_type, zodiac_type, house_system, sun_sign, moon_sign, rising_sign, bodies_json, houses_json, aspects_json, computed_at, expires_at, provider_meta"
      )
      .eq("user_id", query.userId)
      .eq("subject_id", query.subjectId)
      .eq("chart_type", query.chartType)
      .eq("system_type", query.systemType)
      .eq("contract_version", "v1")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectResult.error) {
      throw new Error(`Failed loading chart_snapshots: ${selectResult.error.message}`);
    }

    const row = selectResult.data as ChartSnapshotRow | null;
    if (!row) return null;

    return {
      data: {
        chartType: row.chart_type,
        systemType: row.system_type,
        zodiacType: row.zodiac_type,
        houseSystem: row.house_system,
        sunSign: row.sun_sign,
        moonSign: row.moon_sign,
        risingSign: row.rising_sign,
        bodies: Array.isArray(row.bodies_json) ? row.bodies_json : [],
        houses: Array.isArray(row.houses_json) ? row.houses_json : [],
        aspects: Array.isArray(row.aspects_json) ? row.aspects_json : [],
      },
      sourceProvider: toSourceProvider(row.provider_meta),
      computedAt: row.computed_at,
      expiresAt: row.expires_at,
    };
  }

  async getFresh(query: BirthChartQuery, now: Date): Promise<{
    data: BirthChartDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null> {
    const logger = createServerLogger("astroai.birth-chart.cache-repository");
    const startedAt = Date.now();
    const cached = await this.loadLatest(query);
    const fresh = cached && toFreshnessStatus(cached.expiresAt, now) === "fresh" ? cached : null;
    logger.info("getFresh.complete", {
      durationMs: durationMs(startedAt),
      outcome: fresh ? "hit" : "miss",
      userId: query.userId,
      subjectId: query.subjectId,
      chartType: query.chartType,
      systemType: query.systemType,
      sourceProvider: fresh?.sourceProvider ?? cached?.sourceProvider ?? null,
    });
    return fresh;
  }

  async getStale(query: BirthChartQuery): Promise<{
    data: BirthChartDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null> {
    const logger = createServerLogger("astroai.birth-chart.cache-repository");
    const startedAt = Date.now();
    const cached = await this.loadLatest(query);
    logger.info("getStale.complete", {
      durationMs: durationMs(startedAt),
      outcome: cached ? "hit" : "miss",
      userId: query.userId,
      subjectId: query.subjectId,
      chartType: query.chartType,
      systemType: query.systemType,
      sourceProvider: cached?.sourceProvider ?? null,
    });
    return cached;
  }

  async save(
    query: BirthChartQuery,
    entry: {
      data: BirthChartDTO;
      sourceProvider: string | null;
      computedAt: string | null;
      expiresAt: string | null;
    }
  ): Promise<void> {
    const logger = createServerLogger("astroai.birth-chart.cache-repository");
    const startedAt = Date.now();
    const now = new Date();
    const computedAt = entry.computedAt ?? now.toISOString();
    const freshnessStatus = toFreshnessStatus(entry.expiresAt, now);

    const insertResult = await this.supabase
      .schema("astro_core")
      .from("chart_snapshots")
      .insert({
        user_id: query.userId,
        subject_id: query.subjectId,
        chart_type: entry.data.chartType,
        system_type: entry.data.systemType,
        zodiac_type: entry.data.zodiacType,
        house_system: entry.data.houseSystem,
        ayanamsa: null,
        birth_datetime_utc: computedAt,
        birth_place_name: null,
        latitude: null,
        longitude: null,
        sun_sign: entry.data.sunSign,
        moon_sign: entry.data.moonSign,
        rising_sign: entry.data.risingSign,
        mapper_version: "v1",
        contract_version: "v1",
        computed_at: computedAt,
        expires_at: entry.expiresAt,
        freshness_status: freshnessStatus,
        bodies_json: entry.data.bodies,
        houses_json: entry.data.houses,
        aspects_json: entry.data.aspects,
        provider_meta: {
          source_provider: entry.sourceProvider,
        },
      });

    if (insertResult.error) {
      throw new Error(`Failed saving chart_snapshots: ${insertResult.error.message}`);
    }
    logger.info("save.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      userId: query.userId,
      subjectId: query.subjectId,
      chartType: query.chartType,
      systemType: query.systemType,
      bodies: entry.data.bodies.length,
      aspects: entry.data.aspects.length,
      sourceProvider: entry.sourceProvider,
    });
  }
}
