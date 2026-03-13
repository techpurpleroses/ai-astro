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
  query: TQuery;
  now: Date;
  cache: CacheRepository<TQuery, TData>;
  provider: ProviderFetcher<TQuery, TData>;
}): Promise<CacheResolveResult<TData>> {
  const fresh = await params.cache.getFresh(params.query, params.now);
  if (fresh) {
    return {
      entry: fresh,
      cacheHit: true,
      degraded: false,
      freshnessStatus: "fresh",
    };
  }

  try {
    const fetched = await params.provider.fetch(params.query);
    const computedAt = fetched.computedAt ?? params.now.toISOString();
    const expiresAt = new Date(params.now.getTime() + fetched.ttlSeconds * 1000).toISOString();
    const toSave: CacheEnvelope<TData> = {
      data: fetched.data,
      sourceProvider: fetched.sourceProvider,
      computedAt,
      expiresAt,
    };
    await params.cache.save(params.query, toSave);
    return {
      entry: toSave,
      cacheHit: false,
      degraded: false,
      freshnessStatus: "fresh",
    };
  } catch (error) {
    const stale = params.cache.getStale ? await params.cache.getStale(params.query) : null;
    if (stale) {
      return {
        entry: stale,
        cacheHit: true,
        degraded: true,
        freshnessStatus: "stale",
      };
    }
    throw error;
  }
}

