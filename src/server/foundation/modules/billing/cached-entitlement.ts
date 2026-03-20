/**
 * getCachedEntitlement — per-user entitlement lookup with Next.js cache.
 *
 * Uses unstable_cache with a dynamic per-user key to prevent multi-user
 * data leaks (static key `['subscription']` would serve User A's data to User B).
 *
 * Cache TTL: 5 minutes. Busted immediately on subscription events via revalidateTag.
 *
 * Usage in API routes:
 *   const { planCode, tier, creditBalance } = await getCachedEntitlement(userId)
 *   if (!entitlementAllows(tier, 'palm.scan')) return softPaywallResponse(...)
 *
 * Cache invalidation (in webhook handler after any subscription change):
 *   revalidateTag(`sub:${userId}`)
 */

import { unstable_cache } from 'next/cache'
import { BillingService } from './service'
import { getServiceRoleSupabaseClient } from '@/server/integrations/supabase/service-role-client'

// Mirrors frontend PLAN_TIER — add new tiers in both places
export const PLAN_TIER: Record<string, number> = {
  free: 0,
  pro: 1,
  premium: 2, // reserved
}

// Only these Stripe statuses = real paid access
const ACTIVE_STATUSES = new Set(['active', 'trialing'])

// Feature → minimum plan required
export const API_FEATURE_CAPABILITIES: Record<string, string> = {
  'horoscope.personal': 'pro',
  'birth_chart.full': 'pro',
  'compatibility.deep': 'pro',
  'palm.scan': 'pro',
  'soulmate.generate': 'pro',
  'tarot.modes': 'pro',
}

export interface CachedEntitlement {
  planCode: string
  tier: number
  creditBalance: number
}

export function getCachedEntitlement(userId: string): () => Promise<CachedEntitlement> {
  return unstable_cache(
    async (): Promise<CachedEntitlement> => {
      const db = getServiceRoleSupabaseClient()
      const billing = new BillingService(db)
      const [sub, credits] = await Promise.all([
        billing.getActiveSubscription(userId),
        billing.getCreditBalance(userId),
      ])
      const planCode =
        sub && ACTIVE_STATUSES.has(sub.status) ? sub.planCode : 'free'
      return {
        planCode,
        tier: PLAN_TIER[planCode] ?? 0,
        creditBalance: credits.balance,
      }
    },
    ['entitlement', userId],             // dynamic key — one cache entry per user
    { revalidate: 300, tags: [`sub:${userId}`] }  // bust via revalidateTag(`sub:${userId}`)
  )
}

/** Returns true if the given tier is allowed to use the feature */
export function entitlementAllows(tier: number, feature: string): boolean {
  const required = API_FEATURE_CAPABILITIES[feature]
  if (!required) return true // unknown feature = unrestricted
  const requiredTier = PLAN_TIER[required] ?? 0
  return tier >= requiredTier
}
