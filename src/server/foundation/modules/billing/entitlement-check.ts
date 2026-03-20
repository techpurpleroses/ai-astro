/**
 * requirePlan — server-side entitlement check for API routes.
 * Returns { allowed, planCode } based on user's active subscription.
 *
 * Only 'active' and 'trialing' statuses grant real paid access.
 * All other statuses (past_due, incomplete, canceled, etc.) = free tier.
 *
 * Usage:
 *   const { allowed, planCode } = await requirePlan(userId, 'birth_chart.full', billing)
 *   if (!allowed) return softPaywallResponse('birth_chart.full', planCode)
 */

import type { BillingService } from './service'

// Mirror of the frontend FEATURE_CAPABILITIES map (single source of truth here)
export const FEATURE_CAPABILITIES: Record<string, 'pro'> = {
  'horoscope.personal': 'pro',
  'birth_chart.full': 'pro',
  'compatibility.deep': 'pro',
  'palm.scan': 'pro',
  'soulmate.generate': 'pro',
  'tarot.modes': 'pro',
}

const PLAN_TIER: Record<string, number> = {
  free: 0,
  pro: 1,
  premium: 2, // reserved
}

// Only these Stripe statuses = paid access
const ACTIVE_STATUSES = new Set(['active', 'trialing'])

export async function requirePlan(
  userId: string,
  feature: string,
  billing: BillingService
): Promise<{ allowed: boolean; planCode: string }> {
  const sub = await billing.getActiveSubscription(userId)
  const planCode =
    sub && ACTIVE_STATUSES.has(sub.status) ? sub.planCode : 'free'

  const required = FEATURE_CAPABILITIES[feature]
  const allowed =
    !required || (PLAN_TIER[planCode] ?? 0) >= (PLAN_TIER[required] ?? 0)

  return { allowed, planCode }
}

// ---------------------------------------------------------------------------
// Soft paywall response shape — never return bare 403
// Frontend reads locked:true and shows gate UI without crashing.
// ---------------------------------------------------------------------------

export interface SoftPaywallBody {
  locked: true
  feature: string
  planCode: string
  cta: 'pro_required'
  preview?: unknown
}

export function softPaywallResponse(
  feature: string,
  planCode: string,
  preview?: unknown
): SoftPaywallBody {
  return {
    locked: true,
    feature,
    planCode,
    cta: 'pro_required',
    ...(preview !== undefined ? { preview } : {}),
  }
}
