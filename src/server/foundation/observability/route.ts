import type { NextRequest } from "next/server";
import { ASTRO_DEBUG_ORIGIN_HEADER, ASTRO_TRACE_ID_HEADER, createAstroTraceId } from "@/lib/debug-trace";
import { runWithObservabilityContext } from "./context";
import { createServerLogger, durationMs } from "./logger";

function resolveTraceId(request: NextRequest): string {
  const fromHeader = request.headers.get(ASTRO_TRACE_ID_HEADER)?.trim();
  const fromQuery = request.nextUrl.searchParams.get("traceId")?.trim();
  const candidate = fromHeader || fromQuery;
  if (candidate && candidate.length >= 8) return candidate;
  return createAstroTraceId();
}

export async function observeApiRoute<T extends Response>(params: {
  scope: string;
  request: NextRequest;
  startMeta?: Record<string, unknown>;
  handler: () => Promise<T>;
}): Promise<T> {
  const { request, scope, startMeta, handler } = params;
  const traceId = resolveTraceId(request);
  const requestId = createAstroTraceId();
  const startedAt = Date.now();
  const origin = request.headers.get(ASTRO_DEBUG_ORIGIN_HEADER)?.trim() || undefined;
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  return runWithObservabilityContext(
    {
      traceId,
      requestId,
      method,
      pathname,
      origin,
    },
    async () => {
      const logger = createServerLogger(scope);

      logger.info("request.start", {
        method,
        pathname,
        origin,
        ...startMeta,
      });

      try {
        const response = await handler();
        try {
          response.headers.set(ASTRO_TRACE_ID_HEADER, traceId);
        } catch {
          // Ignore immutable headers on non-Next responses.
        }
        logger.info("request.end", {
          status: response.status,
          durationMs: durationMs(startedAt),
          outcome: response.ok ? "success" : "failure",
        });
        return response;
      } catch (error) {
        logger.error("request.throw", {
          durationMs: durationMs(startedAt),
          outcome: "error",
          error,
        });
        throw error;
      }
    }
  );
}
