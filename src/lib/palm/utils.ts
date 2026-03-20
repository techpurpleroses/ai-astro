import { createServerLogger } from "@/server/foundation/observability/logger";

export type Pt = [number, number]

/** Clamps to [0, 1]; returns 0 for non-finite values. */
export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** General-purpose clamp. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function createDebugLogger(prefix: string) {
  const logger = createServerLogger(prefix)
  return function debugLog(step: string, data?: unknown) {
    logger.info(step, data)
  }
}
