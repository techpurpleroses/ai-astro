import { resolveCacheFirst } from "../../cache-first";
import type { HoroscopeDTO, HoroscopeQuery, HoroscopeResponse } from "./types";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";

// ── Cache repository interface ────────────────────────────────────────────────

export interface HoroscopeCacheRepository {
  getFresh(
    query: HoroscopeQuery,
    now: Date
  ): Promise<{
    data: HoroscopeDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null>;

  getStale?(query: HoroscopeQuery): Promise<{
    data: HoroscopeDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null>;

  save(
    query: HoroscopeQuery,
    entry: {
      data: HoroscopeDTO;
      sourceProvider: string | null;
      computedAt: string | null;
      expiresAt: string | null;
    }
  ): Promise<void>;
}

// ── Provider gateway interface ────────────────────────────────────────────────

export interface HoroscopeProviderGateway {
  fetchHoroscope(query: HoroscopeQuery): Promise<{
    data: HoroscopeDTO;
    sourceProvider: string;
    ttlSeconds?: number;
    computedAt?: string;
  }>;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class HoroscopeService {
  constructor(
    private readonly cache: HoroscopeCacheRepository,
    private readonly provider: HoroscopeProviderGateway
  ) {}

  async getHoroscope(input: HoroscopeQuery & { traceId: string }): Promise<HoroscopeResponse> {
    const logger = createServerLogger("astroai.horoscope.service");
    const startedAt = Date.now();
    const now = new Date();
    const query: HoroscopeQuery = {
      date: input.date,
      systemType: input.systemType,
      sign: input.sign,
    };
    logger.info("getHoroscope.start", query);

    const resolved = await resolveCacheFirst({
      scope: "astroai.horoscope.cache",
      query,
      now,
      cache: this.cache,
      provider: {
        fetch: async (q) => {
          const out = await this.provider.fetchHoroscope(q);
          return {
            data: out.data,
            sourceProvider: out.sourceProvider,
            ttlSeconds: out.ttlSeconds ?? 24 * 60 * 60,
            computedAt: out.computedAt,
          };
        },
      },
    });

    const response = {
      data: resolved.entry.data,
      meta: {
        sourceProvider: resolved.entry.sourceProvider,
        freshnessStatus: resolved.freshnessStatus,
        computedAt: resolved.entry.computedAt,
        contractVersion: "v1",
        traceId: input.traceId,
        cacheHit: resolved.cacheHit,
        degraded: resolved.degraded,
      },
      errors: [],
    };
    logger.info("getHoroscope.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      cacheHit: resolved.cacheHit,
      degraded: resolved.degraded,
      freshnessStatus: resolved.freshnessStatus,
      sourceProvider: resolved.entry.sourceProvider,
    });
    return response;
  }
}
