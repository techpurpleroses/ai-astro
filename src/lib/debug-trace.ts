export const ASTRO_TRACE_ID_HEADER = "x-astro-trace-id";
export const ASTRO_DEBUG_ORIGIN_HEADER = "x-astro-debug-origin";

export function createAstroTraceId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}
