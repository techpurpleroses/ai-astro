/**
 * Per-user global daily rate limiter.
 * Uses platform.usage_counters keyed by (user_id, date) via the
 * platform.check_user_rate_limit() SQL RPC (atomic increment + check).
 *
 * A single global counter covers ALL feature API endpoints — per-endpoint
 * limits can be bypassed by rotating endpoints, so one global cap is safer.
 *
 * Resets at midnight UTC (daily window key = YYYY-MM-DD).
 * Exempt: billing, auth, settings routes — only AI-generating feature routes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase/service-role-client";

export const FREE_DAILY_LIMIT = 20;
export const PRO_DAILY_LIMIT = 200;

const RATE_LIMIT_SCOPE = "user_feature_daily";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
}

/**
 * Check and increment the user's daily API call counter.
 * Returns `allowed: false` once the limit is exceeded.
 * Fails open (returns allowed: true) if the DB call errors — never block
 * a user due to our own infrastructure failure.
 */
export async function checkRateLimit(
  db: SupabaseClient,
  userId: string,
  planCode: string
): Promise<RateLimitResult> {
  return _checkRateLimit(db, userId, planCode);
}

/**
 * Convenience wrapper for API routes — uses the service role client internally.
 * Call after auth + entitlement check, before any AI call.
 */
export async function checkRateLimitForUser(
  userId: string,
  planCode: string
): Promise<RateLimitResult> {
  return _checkRateLimit(getServiceRoleSupabaseClient(), userId, planCode);
}

async function _checkRateLimit(
  db: SupabaseClient,
  userId: string,
  planCode: string
): Promise<RateLimitResult> {
  const limit = planCode === "free" ? FREE_DAILY_LIMIT : PRO_DAILY_LIMIT;

  const { data, error } = await db.rpc("check_user_rate_limit", {
    p_user_id: userId,
    p_scope: RATE_LIMIT_SCOPE,
    p_limit: limit,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    // Fail open — infrastructure error should not block users
    return { allowed: true, count: 0, limit };
  }

  const row = data[0] as {
    allowed: boolean;
    current_count: number;
    limit_cap: number;
  };

  return {
    allowed: row.allowed,
    count: Number(row.current_count),
    limit: row.limit_cap,
  };
}
