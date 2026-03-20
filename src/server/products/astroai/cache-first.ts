import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";

export interface CacheEnvelope<T> {
  data: T;
  sourceProvider: string | null;
  computedAt: string | null;
  expiresAt: string | null;
}

export interface CacheRepository<TQuery, TData> {
  getFresh(query: TQuery, now: Date): Promise<CacheEnvelope<TData> | null>;
  getStale?(query: TQuery): Promise<CacheEnvelope<TData> | null>;
  save(query: TQuery, entry: CacheEnvelope<TData>): Promise<void>;
}

export interface ProviderFetchResult<TData> {
  data: TData;
  sourceProvider: string;
  ttlSeconds: number;
  computedAt?: string;
}

export interface ProviderFetcher<TQuery, TData> {
  fetch(query: TQuery): Promise<ProviderFetchResult<TData>>;
}

export interface CacheResolveResult<TData> {
  entry: CacheEnvelope<TData>;
  cacheHit: boolean;
  degraded: boolean;
  freshnessStatus: "fresh" | "stale" | "expired";
}

export async function resolveCacheFirst<TQuery, TData>(params: {
  scope?: string;
  query: TQuery;
  now: Date;
  cache: CacheRepository<TQuery, TData>;
  provider: ProviderFetcher<TQuery, TData>;
}): Promise<CacheResolveResult<TData>> {
  const logger = createServerLogger(params.scope ?? "astroai.cache-first");

  const freshStartedAt = Date.now();
  const fresh = await params.cache.getFresh(params.query, params.now);
  if (fresh) {
    logger.info("cache.hit.fresh", {
      durationMs: durationMs(freshStartedAt),
      outcome: "hit",
      sourceProvider: fresh.sourceProvider,
      expiresAt: fresh.expiresAt,
    });
    return {
      entry: fresh,
      cacheHit: true,
      degraded: false,
      freshnessStatus: "fresh",
    };
  }
  logger.info("cache.miss.fresh", {
    durationMs: durationMs(freshStartedAt),
    outcome: "miss",
    query: params.query,
  });

  try {
    const providerStartedAt = Date.now();
    const fetched = await params.provider.fetch(params.query);
    logger.info("provider.fetch.success", {
      durationMs: durationMs(providerStartedAt),
      outcome: "success",
      sourceProvider: fetched.sourceProvider,
      ttlSeconds: fetched.ttlSeconds,
    });
    const computedAt = fetched.computedAt ?? params.now.toISOString();
    const expiresAt = new Date(params.now.getTime() + fetched.ttlSeconds * 1000).toISOString();
    const toSave: CacheEnvelope<TData> = {
      data: fetched.data,
      sourceProvider: fetched.sourceProvider,
      computedAt,
      expiresAt,
    };
    const saveStartedAt = Date.now();
    await params.cache.save(params.query, toSave);
    logger.info("cache.save.success", {
      durationMs: durationMs(saveStartedAt),
      outcome: "success",
      sourceProvider: toSave.sourceProvider,
      expiresAt: toSave.expiresAt,
    });
    return {
      entry: toSave,
      cacheHit: false,
      degraded: false,
      freshnessStatus: "fresh",
    };
  } catch (error) {
    logger.error("provider.fetch.error", {
      outcome: "error",
      error,
    });
    const staleStartedAt = Date.now();
    const stale = params.cache.getStale ? await params.cache.getStale(params.query) : null;
    if (stale) {
      logger.warn("cache.hit.stale", {
        durationMs: durationMs(staleStartedAt),
        outcome: "stale",
        sourceProvider: stale.sourceProvider,
        expiresAt: stale.expiresAt,
      });
      return {
        entry: stale,
        cacheHit: true,
        degraded: true,
        freshnessStatus: "stale",
      };
    }
    logger.error("cache.miss.stale", {
      durationMs: durationMs(staleStartedAt),
      outcome: "miss",
      query: params.query,
      error,
    });
    throw error;
  }
}
