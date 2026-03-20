import type { DateScopedQuery } from "../../contracts";
import type { TodayDTO, TodayResponse } from "./types";
import { resolveCacheFirst } from "../../cache-first";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";

export interface TodayCacheRepository {
  getFresh(query: DateScopedQuery, now: Date): Promise<{
    data: TodayDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null>;
  getStale?(query: DateScopedQuery): Promise<{
    data: TodayDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null>;
  save(
    query: DateScopedQuery,
    entry: {
      data: TodayDTO;
      sourceProvider: string | null;
      computedAt: string | null;
      expiresAt: string | null;
    }
  ): Promise<void>;
}

export interface TodayProviderGateway {
  fetchToday(query: DateScopedQuery): Promise<{
    data: TodayDTO;
    sourceProvider: string;
    ttlSeconds?: number;
    computedAt?: string;
  }>;
}

export class TodayService {
  constructor(
    private readonly cache: TodayCacheRepository,
    private readonly provider: TodayProviderGateway
  ) {}

  async getToday(input: DateScopedQuery & { traceId: string }): Promise<TodayResponse> {
    const logger = createServerLogger("astroai.today.service");
    const startedAt = Date.now();
    const now = new Date();
    logger.info("getToday.start", {
      date: input.date,
      systemType: input.systemType,
    });
    const resolved = await resolveCacheFirst({
      scope: "astroai.today.cache",
      query: { date: input.date, systemType: input.systemType },
      now,
      cache: this.cache,
      provider: {
        fetch: async (q) => {
          const out = await this.provider.fetchToday(q);
          return {
            data: out.data,
            sourceProvider: out.sourceProvider,
            ttlSeconds: out.ttlSeconds ?? 6 * 60 * 60,
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
    logger.info("getToday.success", {
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
