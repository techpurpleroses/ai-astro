import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import type { DateScopedQuery } from "../../contracts";
import type { TodayCacheRepository } from "./service";
import type { TodayDTO } from "./types";

interface MoonFactRow {
  phase_name: string;
  illumination_pct: number;
  sign: string | null;
  computed_at: string;
  expires_at: string | null;
  provider_meta: Record<string, unknown> | null;
}

interface TransitFactRow {
  title: string | null;
  transiting_planet: string;
  target_planet: string | null;
  aspect_type: string | null;
  interpretation: string | null;
}

interface EventFactRow {
  title: string;
  event_type: string;
  significance: string;
  event_at: string;
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

function toSourceProvider(meta: Record<string, unknown> | null): string | null {
  const value = meta?.source_provider;
  return typeof value === "string" ? value : null;
}

function normalizeEventSignificance(value: string): "low" | "medium" | "high" {
  const normalized = value.toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }
  return "medium";
}

export class SupabaseTodayCacheRepository implements TodayCacheRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private async loadByDate(query: DateScopedQuery): Promise<{
    data: TodayDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null> {
    const moonQuery = await this.supabase
      .schema("astro_core")
      .from("moon_facts_daily")
      .select("phase_name, illumination_pct, sign, computed_at, expires_at, provider_meta")
      .eq("fact_date", query.date)
      .eq("system_type", query.systemType)
      .eq("contract_version", "v1")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (moonQuery.error) {
      throw new Error(`Failed loading moon_facts_daily: ${moonQuery.error.message}`);
    }

    const moon = moonQuery.data as MoonFactRow | null;
    if (!moon) return null;

    const transitQuery = await this.supabase
      .schema("astro_core")
      .from("transit_facts_daily")
      .select("title, transiting_planet, target_planet, aspect_type, interpretation")
      .eq("fact_date", query.date)
      .eq("system_type", query.systemType)
      .eq("contract_version", "v1")
      .order("starts_at", { ascending: true, nullsFirst: true });

    if (transitQuery.error) {
      throw new Error(`Failed loading transit_facts_daily: ${transitQuery.error.message}`);
    }

    const eventQuery = await this.supabase
      .schema("astro_core")
      .from("astro_event_facts")
      .select("title, event_type, significance, event_at")
      .eq("event_date", query.date)
      .eq("system_type", query.systemType)
      .eq("contract_version", "v1")
      .order("event_at", { ascending: true });

    if (eventQuery.error) {
      throw new Error(`Failed loading astro_event_facts: ${eventQuery.error.message}`);
    }

    const transits = (transitQuery.data as TransitFactRow[] | null) ?? [];
    const events = (eventQuery.data as EventFactRow[] | null) ?? [];

    return {
      data: {
        moon: {
          phaseName: moon.phase_name,
          illuminationPct: Number(moon.illumination_pct),
          sign: moon.sign,
        },
        transits: transits.map((item) => ({
          title: item.title,
          transitingPlanet: item.transiting_planet,
          targetPlanet: item.target_planet,
          aspectType: item.aspect_type,
          interpretation: item.interpretation,
        })),
        events: events.map((item) => ({
          title: item.title,
          eventType: item.event_type,
          significance: normalizeEventSignificance(item.significance),
          eventAt: item.event_at,
        })),
      },
      sourceProvider: toSourceProvider(moon.provider_meta),
      computedAt: moon.computed_at ?? null,
      expiresAt: moon.expires_at,
    };
  }

  async getFresh(query: DateScopedQuery, now: Date): Promise<{
    data: TodayDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null> {
    const logger = createServerLogger("astroai.today.cache-repository");
    const startedAt = Date.now();
    const cached = await this.loadByDate(query);
    const fresh = cached && toFreshnessStatus(cached.expiresAt, now) === "fresh" ? cached : null;
    logger.info("getFresh.complete", {
      durationMs: durationMs(startedAt),
      outcome: fresh ? "hit" : "miss",
      date: query.date,
      systemType: query.systemType,
      hasCached: Boolean(cached),
      sourceProvider: fresh?.sourceProvider ?? cached?.sourceProvider ?? null,
    });
    return fresh;
  }

  async getStale(query: DateScopedQuery): Promise<{
    data: TodayDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null> {
    const logger = createServerLogger("astroai.today.cache-repository");
    const startedAt = Date.now();
    const cached = await this.loadByDate(query);
    logger.info("getStale.complete", {
      durationMs: durationMs(startedAt),
      outcome: cached ? "hit" : "miss",
      date: query.date,
      systemType: query.systemType,
      sourceProvider: cached?.sourceProvider ?? null,
    });
    return cached;
  }

  async save(
    query: DateScopedQuery,
    entry: {
      data: TodayDTO;
      sourceProvider: string | null;
      computedAt: string | null;
      expiresAt: string | null;
    }
  ): Promise<void> {
    const logger = createServerLogger("astroai.today.cache-repository");
    const startedAt = Date.now();
    const now = new Date();
    const computedAt = entry.computedAt ?? now.toISOString();
    const freshnessStatus = toFreshnessStatus(entry.expiresAt, now);

    const moonResult = await this.supabase
      .schema("astro_core")
      .from("moon_facts_daily")
      .upsert(
        {
          fact_date: query.date,
          system_type: query.systemType,
          phase_name: entry.data.moon.phaseName,
          illumination_pct: entry.data.moon.illuminationPct,
          age_days: 0,
          sign: entry.data.moon.sign,
          is_waxing: entry.data.moon.phaseName.toLowerCase().includes("wax"),
          mapper_version: "v1",
          contract_version: "v1",
          computed_at: computedAt,
          expires_at: entry.expiresAt,
          freshness_status: freshnessStatus,
          provider_meta: {
            source_provider: entry.sourceProvider,
          },
        },
        {
          onConflict: "fact_date,system_type,contract_version",
        }
      );
    if (moonResult.error) {
      throw new Error(`Failed saving moon_facts_daily: ${moonResult.error.message}`);
    }

    const deleteTransits = await this.supabase
      .schema("astro_core")
      .from("transit_facts_daily")
      .delete()
      .eq("fact_date", query.date)
      .eq("system_type", query.systemType)
      .eq("contract_version", "v1");
    if (deleteTransits.error) {
      throw new Error(`Failed replacing transit_facts_daily: ${deleteTransits.error.message}`);
    }

    if (entry.data.transits.length > 0) {
      const transitRows = entry.data.transits.map((item) => ({
        fact_date: query.date,
        system_type: query.systemType,
        transiting_planet: item.transitingPlanet,
        target_planet: item.targetPlanet,
        aspect_type: item.aspectType,
        orb: null,
        duration_class: "short_term",
        title: item.title,
        interpretation: item.interpretation,
        mapper_version: "v1",
        contract_version: "v1",
        computed_at: computedAt,
        expires_at: entry.expiresAt,
        freshness_status: freshnessStatus,
        provider_meta: {
          source_provider: entry.sourceProvider,
        },
      }));

      const insertTransits = await this.supabase
        .schema("astro_core")
        .from("transit_facts_daily")
        .insert(transitRows);
      if (insertTransits.error) {
        throw new Error(`Failed inserting transit_facts_daily: ${insertTransits.error.message}`);
      }
    }

    const deleteEvents = await this.supabase
      .schema("astro_core")
      .from("astro_event_facts")
      .delete()
      .eq("event_date", query.date)
      .eq("system_type", query.systemType)
      .eq("contract_version", "v1");
    if (deleteEvents.error) {
      throw new Error(`Failed replacing astro_event_facts: ${deleteEvents.error.message}`);
    }

    if (entry.data.events.length > 0) {
      const eventRows = entry.data.events.map((item) => ({
        event_at: item.eventAt,
        event_date: query.date,
        system_type: query.systemType,
        event_type: item.eventType,
        significance: item.significance,
        title: item.title,
        description: null,
        tags: [],
        mapper_version: "v1",
        contract_version: "v1",
        computed_at: computedAt,
        expires_at: entry.expiresAt,
        freshness_status: freshnessStatus,
        provider_meta: {
          source_provider: entry.sourceProvider,
        },
      }));

      const insertEvents = await this.supabase
        .schema("astro_core")
        .from("astro_event_facts")
        .insert(eventRows);
      if (insertEvents.error) {
        throw new Error(`Failed inserting astro_event_facts: ${insertEvents.error.message}`);
      }
    }
    logger.info("save.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      date: query.date,
      systemType: query.systemType,
      transits: entry.data.transits.length,
      events: entry.data.events.length,
      sourceProvider: entry.sourceProvider,
    });
  }
}
