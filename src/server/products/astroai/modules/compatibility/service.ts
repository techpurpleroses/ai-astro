import type { CompatibilityDTO, CompatibilityResponse } from "./types";
import { resolveCacheFirst } from "../../cache-first";

export interface CompatibilityQuery {
  systemType: string;
  signA: string;
  signB: string;
}

export interface CompatibilityCacheRepository {
  getFresh(query: CompatibilityQuery, now: Date): Promise<{
    data: CompatibilityDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null>;
  getStale?(query: CompatibilityQuery): Promise<{
    data: CompatibilityDTO;
    sourceProvider: string | null;
    computedAt: string | null;
    expiresAt: string | null;
  } | null>;
  save(
    query: CompatibilityQuery,
    entry: {
      data: CompatibilityDTO;
      sourceProvider: string | null;
      computedAt: string | null;
      expiresAt: string | null;
    }
  ): Promise<void>;
}

export interface CompatibilityProviderGateway {
  fetchCompatibility(query: CompatibilityQuery): Promise<{
    data: CompatibilityDTO;
    sourceProvider: string;
    ttlSeconds?: number;
    computedAt?: string;
  }>;
}

export class CompatibilityService {
  constructor(
    private readonly cache: CompatibilityCacheRepository,
    private readonly provider: CompatibilityProviderGateway
  ) {}

  async getCompatibility(input: CompatibilityQuery & { traceId: string }): Promise<CompatibilityResponse> {
    const now = new Date();
    const query: CompatibilityQuery = {
      systemType: input.systemType,
      signA: input.signA,
      signB: input.signB,
    };

    const resolved = await resolveCacheFirst({
      query,
      now,
      cache: this.cache,
      provider: {
        fetch: async (q) => {
          const out = await this.provider.fetchCompatibility(q);
          return {
            data: out.data,
            sourceProvider: out.sourceProvider,
            ttlSeconds: out.ttlSeconds ?? 30 * 24 * 60 * 60,
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

