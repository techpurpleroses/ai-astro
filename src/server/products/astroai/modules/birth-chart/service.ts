import type { BirthChartDTO, BirthChartResponse } from "./types";
import { resolveCacheFirst } from "../../cache-first";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";

export interface BirthChartQuery {
  userId: string;
  subjectId: string;
  chartType: string;
  systemType: string;
}

export interface BirthChartCacheRepository {
  getFresh(query: BirthChartQuery, now: Date): Promise<{
    data: BirthChartDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null>;
  getStale?(query: BirthChartQuery): Promise<{
    data: BirthChartDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null>;
  save(
    query: BirthChartQuery,
    entry: {
      data: BirthChartDTO;
      sourceProvider: string | null;
      computedAt: string | null;
      expiresAt: string | null;
    }
  ): Promise<void>;
}

export interface BirthChartProviderGateway {
  fetchBirthChart(query: BirthChartQuery): Promise<{
    data: BirthChartDTO;
    sourceProvider: string;
    ttlSeconds?: number;
    computedAt?: string;
  }>;
}

export class BirthChartService {
  constructor(
    private readonly cache: BirthChartCacheRepository,
    private readonly provider: BirthChartProviderGateway
  ) {}

  async getBirthChart(input: BirthChartQuery & { traceId: string }): Promise<BirthChartResponse> {
    const logger = createServerLogger("astroai.birth-chart.service");
    const startedAt = Date.now();
    const now = new Date();
    const query: BirthChartQuery = {
      userId: input.userId,
      subjectId: input.subjectId,
      chartType: input.chartType,
      systemType: input.systemType,
    };
    logger.info("getBirthChart.start", {
      userId: input.userId,
      subjectId: input.subjectId,
      chartType: input.chartType,
      systemType: input.systemType,
    });

    const resolved = await resolveCacheFirst({
      scope: "astroai.birth-chart.cache",
      query,
      now,
      cache: this.cache,
      provider: {
        fetch: async (q) => {
          const out = await this.provider.fetchBirthChart(q);
          return {
            data: out.data,
            sourceProvider: out.sourceProvider,
            ttlSeconds: out.ttlSeconds ?? 30 * 24 * 60 * 60,
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
    logger.info("getBirthChart.success", {
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
