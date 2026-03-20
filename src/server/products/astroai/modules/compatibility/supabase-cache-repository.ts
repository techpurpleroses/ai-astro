import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import type { CompatibilityCacheRepository, CompatibilityQuery } from "./service";
import type { CompatibilityDTO } from "./types";

interface CompatibilityRow {
  sign_a: string;
  sign_b: string;
  overall: number;
  love: number;
  career: number;
  friendship: number;
  sex: number;
  summary: string;
  strengths: string[];
  challenges: string[];
  computed_at: string;
  expires_at: string | null;
  provider_meta: Record<string, unknown> | null;
}

function normalizeSign(input: string): string {
  return input.trim().toLowerCase();
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

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export class SupabaseCompatibilityCacheRepository implements CompatibilityCacheRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private async loadByQuery(query: CompatibilityQuery): Promise<{
    data: CompatibilityDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null> {
    const selectResult = await this.supabase
      .schema("astro_core")
      .from("compatibility_facts")
      .select(
        "sign_a, sign_b, overall, love, career, friendship, sex, summary, strengths, challenges, computed_at, expires_at, provider_meta"
      )
      .eq("system_type", query.systemType)
      .eq("sign_a", normalizeSign(query.signA))
      .eq("sign_b", normalizeSign(query.signB))
      .eq("contract_version", "v1")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectResult.error) {
      throw new Error(`Failed loading compatibility_facts: ${selectResult.error.message}`);
    }

    const row = selectResult.data as CompatibilityRow | null;
    if (!row) return null;

    return {
      data: {
        signA: row.sign_a,
        signB: row.sign_b,
        overall: row.overall,
        love: row.love,
        career: row.career,
        friendship: row.friendship,
        sex: row.sex,
        summary: row.summary,
        strengths: Array.isArray(row.strengths) ? row.strengths.map((item) => String(item)) : [],
        challenges: Array.isArray(row.challenges)
          ? row.challenges.map((item) => String(item))
          : [],
      },
      sourceProvider: toSourceProvider(row.provider_meta),
      computedAt: row.computed_at,
      expiresAt: row.expires_at,
    };
  }

  async getFresh(query: CompatibilityQuery, now: Date): Promise<{
    data: CompatibilityDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null> {
    const logger = createServerLogger("astroai.compatibility.cache-repository");
    const startedAt = Date.now();
    const cached = await this.loadByQuery(query);
    const fresh = cached && toFreshnessStatus(cached.expiresAt, now) === "fresh" ? cached : null;
    logger.info("getFresh.complete", {
      durationMs: durationMs(startedAt),
      outcome: fresh ? "hit" : "miss",
      signA: query.signA,
      signB: query.signB,
      systemType: query.systemType,
      sourceProvider: fresh?.sourceProvider ?? cached?.sourceProvider ?? null,
    });
    return fresh;
  }

  async getStale(query: CompatibilityQuery): Promise<{
    data: CompatibilityDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null> {
    const logger = createServerLogger("astroai.compatibility.cache-repository");
    const startedAt = Date.now();
    const cached = await this.loadByQuery(query);
    logger.info("getStale.complete", {
      durationMs: durationMs(startedAt),
      outcome: cached ? "hit" : "miss",
      signA: query.signA,
      signB: query.signB,
      systemType: query.systemType,
      sourceProvider: cached?.sourceProvider ?? null,
    });
    return cached;
  }

  async save(
    query: CompatibilityQuery,
    entry: {
      data: CompatibilityDTO;
      sourceProvider: string | null;
      computedAt: string | null;
      expiresAt: string | null;
    }
  ): Promise<void> {
    const logger = createServerLogger("astroai.compatibility.cache-repository");
    const startedAt = Date.now();
    const now = new Date();
    const computedAt = entry.computedAt ?? now.toISOString();
    const freshnessStatus = toFreshnessStatus(entry.expiresAt, now);

    const upsert = await this.supabase
      .schema("astro_core")
      .from("compatibility_facts")
      .upsert(
        {
          system_type: query.systemType,
          sign_a: normalizeSign(entry.data.signA),
          sign_b: normalizeSign(entry.data.signB),
          overall: clampScore(entry.data.overall),
          love: clampScore(entry.data.love),
          career: clampScore(entry.data.career),
          friendship: clampScore(entry.data.friendship),
          sex: clampScore(entry.data.sex),
          summary: entry.data.summary,
          strengths: entry.data.strengths,
          challenges: entry.data.challenges,
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
          onConflict: "system_type,sign_a,sign_b,contract_version",
        }
      );

    if (upsert.error) {
      throw new Error(`Failed saving compatibility_facts: ${upsert.error.message}`);
    }
    logger.info("save.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      signA: query.signA,
      signB: query.signB,
      systemType: query.systemType,
      overall: entry.data.overall,
      sourceProvider: entry.sourceProvider,
    });
  }
}
