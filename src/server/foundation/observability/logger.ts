import { getObservabilityContext } from "./context";

type LogLevel = "debug" | "info" | "warn" | "error";

const REDACTED = "[REDACTED]";
const SECRET_KEY_PATTERN =
  /pass(word)?|token|secret|authorization|cookie|api[_-]?key|session|credential/i;
const EMAIL_KEY_PATTERN = /email/i;
const LONG_STRING_LIMIT = 240;
const MAX_DEPTH = 5;
const MAX_KEYS = 25;
const MAX_ARRAY_ITEMS = 10;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function maskEmail(value: string): string {
  const [localPart, domain] = value.split("@");
  if (!localPart || !domain) return value;
  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}*@${domain}`;
  }
  return `${localPart.slice(0, 2)}***@${domain}`;
}

function sanitizeString(value: string, key?: string): string {
  if (key && SECRET_KEY_PATTERN.test(key)) return REDACTED;
  if (/^data:/i.test(value)) return `[DATA_URL length=${value.length}]`;
  if (/^Bearer\s+/i.test(value)) return REDACTED;
  if (key && EMAIL_KEY_PATTERN.test(key)) return maskEmail(value);
  if (value.length > LONG_STRING_LIMIT) return `[STRING length=${value.length}]`;
  return value;
}

function sanitizeError(error: Error): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };

  if (process.env.NODE_ENV !== "production" && error.stack) {
    out.stack = error.stack.split("\n").slice(0, 6).join("\n");
  }

  return out;
}

function sanitizeForLogs(value: unknown, key?: string, depth = 0): unknown {
  if (key && SECRET_KEY_PATTERN.test(key)) return REDACTED;
  if (depth >= MAX_DEPTH) return "[MaxDepth]";
  if (value instanceof Error) return sanitizeError(value);
  if (value == null) return value;
  if (typeof value === "string") return sanitizeString(value, key);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof URL) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeForLogs(item, key, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`[+${value.length - MAX_ARRAY_ITEMS} more]`);
    }
    return items;
  }
  if (value instanceof Map) {
    return sanitizeForLogs(Object.fromEntries(value), key, depth + 1);
  }
  if (value instanceof Set) {
    return sanitizeForLogs(Array.from(value), key, depth + 1);
  }
  if (!isPlainObject(value)) return String(value);

  const out: Record<string, unknown> = {};
  const keys = Object.keys(value);
  for (const objectKey of keys.slice(0, MAX_KEYS)) {
    out[objectKey] = sanitizeForLogs(value[objectKey], objectKey, depth + 1);
  }
  if (keys.length > MAX_KEYS) {
    out.__truncatedKeys = keys.length - MAX_KEYS;
  }
  return out;
}

function isVerboseLoggingEnabled(): boolean {
  return process.env.ASTRO_DEBUG_LOGS === "1" && process.env.NODE_ENV !== "production";
}

function normalizeMeta(meta: unknown): Record<string, unknown> | undefined {
  if (meta === undefined) return undefined;
  const sanitized = sanitizeForLogs(meta);
  if (isPlainObject(sanitized)) return sanitized;
  return { value: sanitized };
}

function writeLog(
  level: LogLevel,
  scope: string,
  event: string,
  meta?: unknown,
  force = false
) {
  if (!force && !isVerboseLoggingEnabled()) {
    return;
  }

  const context = getObservabilityContext();
  const timestamp = new Date().toISOString();
  const sanitizedMeta = normalizeMeta(meta);
  const tail = sanitizedMeta && Object.keys(sanitizedMeta).length ? ` ${JSON.stringify(sanitizedMeta)}` : "";
  const parts = [
    "[astro-debug]",
    timestamp,
    level.toUpperCase(),
    scope,
    event,
  ];

  if (context?.traceId) parts.push(`traceId=${context.traceId}`);
  if (context?.requestId) parts.push(`requestId=${context.requestId}`);
  if (typeof sanitizedMeta?.durationMs === "number") parts.push(`durationMs=${sanitizedMeta.durationMs}`);
  if (typeof sanitizedMeta?.outcome === "string") parts.push(`outcome=${sanitizedMeta.outcome}`);

  const line = `${parts.join(" ")}${tail}`;

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export interface ServerLogger {
  debug(event: string, meta?: unknown): void;
  info(event: string, meta?: unknown): void;
  warn(event: string, meta?: unknown): void;
  error(event: string, meta?: unknown): void;
  child(scopeSuffix: string): ServerLogger;
}

export function createServerLogger(scope: string): ServerLogger {
  return {
    debug(event, meta) {
      writeLog("debug", scope, event, meta);
    },
    info(event, meta) {
      writeLog("info", scope, event, meta);
    },
    warn(event, meta) {
      writeLog("warn", scope, event, meta);
    },
    error(event, meta) {
      writeLog("error", scope, event, meta, true);
    },
    child(scopeSuffix) {
      return createServerLogger(`${scope}.${scopeSuffix}`);
    },
  };
}

export function durationMs(startedAt: number): number {
  return Date.now() - startedAt;
}

export function isServerDebugLoggingEnabled(): boolean {
  return isVerboseLoggingEnabled();
}
