import { ASTRO_DEBUG_ORIGIN_HEADER, ASTRO_TRACE_ID_HEADER, createAstroTraceId } from "@/lib/debug-trace";

export interface AstroFetchOptions extends RequestInit {
  debugOrigin: string;
  traceId?: string;
}

export async function astroFetch(
  input: RequestInfo | URL,
  options: AstroFetchOptions
): Promise<Response> {
  const headers = new Headers(options.headers);
  const traceId = options.traceId ?? createAstroTraceId();

  headers.set(ASTRO_TRACE_ID_HEADER, traceId);
  headers.set(ASTRO_DEBUG_ORIGIN_HEADER, options.debugOrigin);

  return fetch(input, {
    ...options,
    headers,
  });
}

export async function astroFetchJson<T>(
  input: RequestInfo | URL,
  options: AstroFetchOptions
): Promise<T> {
  const response = await astroFetch(input, options);
  const data = (await response.json()) as T & { error?: unknown };

  if (!response.ok) {
    const reason =
      typeof data?.error === "string"
        ? data.error
        : `request_failed_${response.status}`;
    throw new Error(reason);
  }

  return data;
}
