import type { DateScopedQuery } from "../../contracts";
import type { TodayDTO, TodayResponse } from "./types";
import { resolveCacheFirst } from "../../cache-first";

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
    const now = new Date();
    const resolved = await resolveCacheFirst({
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

    return {
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
  }
}

