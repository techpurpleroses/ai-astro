'use client'

import { useQuery } from '@tanstack/react-query'
import { astroFetchJson } from '@/lib/client/astro-fetch'
import type { ActiveSubscription, CreditBalance } from '@/server/foundation/modules/billing/service'

// ---------------------------------------------------------------------------
// Feature capability map — single source of truth for frontend gating
// Add a new feature: just add it here. No scattered string comparisons.
// ---------------------------------------------------------------------------

export const FEATURE_CAPABILITIES = {
  'horoscope.personal': 'pro',
  'birth_chart.full': 'pro',
  'compatibility.deep': 'pro',
  'palm.scan': 'pro',
  'soulmate.generate': 'pro',
  'tarot.modes': 'pro',
  'prediction.report': 'pro',
} as const satisfies Record<string, 'pro'>

export type FeatureKey = keyof typeof FEATURE_CAPABILITIES

// Numeric tier map — add new plans here without touching any other code
const PLAN_TIER: Record<string, number> = {
  free: 0,
  pro: 1,
  premium: 2, // reserved — keep for future tier expansion
}

// Only these statuses = real paid access. past_due/incomplete/canceled = free.
const ACTIVE_STATUSES = new Set(['active', 'trialing'])

interface SubscriptionResponse {
  subscription: ActiveSubscription | null
  credits: CreditBalance
}

// ---------------------------------------------------------------------------
// usePlan — primary hook for all gating decisions
// Cached for 5 minutes with per-user query key. Auto-refetches on window focus.
// ---------------------------------------------------------------------------

export function usePlan() {
  const query = useQuery<SubscriptionResponse>({
    queryKey: ['billing', 'subscription'],
    queryFn: () =>
      astroFetchJson<SubscriptionResponse>('/api/billing/subscription', {
        debugOrigin: 'hooks.use-plan',
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
    retry: 1,
  })

  const sub = query.data?.subscription ?? null
  const planCode =
    sub && ACTIVE_STATUSES.has(sub.status) ? sub.planCode : 'free'
  const creditBalance = query.data?.credits?.balance ?? 0
  const tier = PLAN_TIER[planCode] ?? 0

  function canAccess(feature: FeatureKey): boolean {
    const required = FEATURE_CAPABILITIES[feature]
    const requiredTier = PLAN_TIER[required] ?? 0
    return tier >= requiredTier
  }

  return {
    planCode,
    tier,
    isLoading: query.isLoading,
    isPro: planCode === 'pro' || planCode === 'premium',
    creditBalance,
    subscription: sub,
    canAccess,
  }
}
