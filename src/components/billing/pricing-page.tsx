'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Zap, Sparkles, ChevronLeft, Coins } from 'lucide-react'
import { astroFetch } from '@/lib/client/astro-fetch'

// ---------------------------------------------------------------------------
// Static plan config (display only — pricing data comes from /api/billing/plans)
// ---------------------------------------------------------------------------

const PRO_FEATURES = [
  'Everything in Free',
  'Full personalized horoscope + transits',
  'Complete birth chart (planets, houses, aspects)',
  'All tarot modes (love, near future, yes/no)',
  'Unlimited palm readings',
  'Unlimited soulmate sketches',
  'Deep compatibility reports',
  'Story reader — all content',
]

const FREE_FEATURES = [
  'Daily sign horoscope',
  'Moon phase & events',
  'Big Three birth chart',
  'Basic compatibility (sign pairs)',
  'Tarot card of the day',
  'Story articles',
  'Magic ball',
]

// Anchor prices shown as crossed-out (psychology)
const PRICE_ANCHORS: Record<string, string> = {
  month: '$39.99/mo',
  year: '$239/yr',
}

// Credit packs — lookup keys match billing.plan_price_versions (USD, one_time)
// Decoy pricing: 100 pack is same rate as 50, making 200 look like obvious best value
const CREDIT_PACK_DEFS = [
  { lookupKey: 'astroai_credits_50_usd',  credits: 50,  label: 'Starter Pack', popular: false },
  { lookupKey: 'astroai_credits_100_usd', credits: 100, label: 'Value Pack',    popular: false },
  { lookupKey: 'astroai_credits_200_usd', credits: 200, label: 'Best Value',    popular: true  },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PriceRow {
  planCode: string
  lookupKey: string | null
  billingInterval: 'month' | 'year' | 'one_time' | 'week'
  amountMinor: number
  currency: string
}

interface PlanRow {
  planCode: string
  displayName: string
  description: string | null
}

interface ActiveSubscription {
  planCode: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

interface Props {
  plans: PlanRow[]
  prices: PriceRow[]
  subscription: ActiveSubscription | null
  creditBalance: number
  hasUsedTrial: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(amountMinor: number, currency: string): string {
  const code = currency.toUpperCase()
  if (code === 'INR') return `₹${(amountMinor / 100).toLocaleString('en-IN')}`
  if (code === 'USD') return `$${(amountMinor / 100).toFixed(2)}`
  return `${code} ${(amountMinor / 100).toFixed(2)}`
}

function getPriceForInterval(
  prices: PriceRow[],
  planCode: string,
  interval: string
) {
  return prices.find(
    (p) => p.planCode === planCode && p.billingInterval === interval
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Interval = 'week' | 'month' | 'year'

export function PricingPage({ plans, prices, subscription, creditBalance, hasUsedTrial }: Props) {
  const router = useRouter()
  const [interval, setInterval] = useState<Interval>('year') // default yearly (pushes annual LTV)
  const [loading, setLoading] = useState<string | null>(null)

  const activePlanCode =
    subscription?.status === 'active' || subscription?.status === 'trialing'
      ? subscription.planCode
      : 'free'

  async function handleSubscribe(lookupKey: string, withTrial = false) {
    if (loading) return
    setLoading(lookupKey)
    try {
      const { url } = await astroFetch('/api/stripe/checkout', {
        debugOrigin: 'billing.pricing.subscribe',
        method: 'POST',
        body: JSON.stringify({ lookup_key: lookupKey, trial: withTrial }),
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json() as Promise<{ url: string }>)
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  async function handleManage() {
    if (loading) return
    setLoading('portal')
    try {
      const { url } = await astroFetch('/api/stripe/portal', {
        debugOrigin: 'billing.pricing.portal',
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json() as Promise<{ url: string }>)
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  // Only show Pro from plans (filter out free + premium if present in DB)
  const proPlan = plans.find((p) => p.planCode === 'pro')
  const priceRow = proPlan ? getPriceForInterval(prices, 'pro', interval) : null
  const monthlyRow = proPlan ? getPriceForInterval(prices, 'pro', 'month') : null
  const lookupKey =
    priceRow?.lookupKey ?? `astroai_pro_${interval}_usd`
  const isCurrentPro = activePlanCode === 'pro' || activePlanCode === 'premium'
  const isLoadingPro = loading === lookupKey

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(10,22,40,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6"
        >
          <ChevronLeft size={16} className="text-text-secondary" />
        </button>
        <h1 className="font-mystical text-2xl text-[#F4E2B4] leading-none">Choose Your Plan</h1>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-6">

        {/* Current plan banner */}
        {subscription && (subscription.status === 'active' || subscription.status === 'trialing') && (
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            style={{
              background: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.2)',
            }}
          >
            <div>
              <p className="text-sm font-semibold text-cyan-300 capitalize">
                {subscription.planCode} plan active
              </p>
              {subscription.currentPeriodEnd && (
                <p className="text-xs text-text-muted mt-0.5">
                  {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => void handleManage()}
              disabled={loading === 'portal'}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}
            >
              {loading === 'portal' ? 'Opening…' : 'Manage'}
            </button>
          </div>
        )}

        {/* Credit balance */}
        {creditBalance > 0 && (
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <Coins size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm text-text-secondary">
              <span className="font-bold text-amber-300">{creditBalance}</span> advisor credits available
            </p>
          </div>
        )}

        {/* Billing interval toggle */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className="inline-flex rounded-xl p-1 gap-1"
            style={{ background: 'rgba(15,30,53,0.9)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {(['week', 'month', 'year'] as const).map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={
                  interval === iv
                    ? { background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }
                    : { color: 'rgba(255,255,255,0.4)' }
                }
              >
                {iv === 'week' ? 'Weekly' : iv === 'month' ? 'Monthly' : 'Yearly'}
                {iv === 'year' && (
                  <span className="ml-1.5 text-xs text-lime-400 font-bold">BEST VALUE</span>
                )}
              </button>
            ))}
          </div>
          {interval === 'week' && (
            <p className="text-xs text-text-muted">Weekly access · $6.99 — switch to Monthly and save 43%</p>
          )}
        </div>

        {/* Pro plan card */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: interval === 'year'
              ? 'linear-gradient(135deg, rgba(34,211,238,0.14), rgba(15,30,53,0.97))'
              : 'linear-gradient(135deg, rgba(34,211,238,0.10), rgba(15,30,53,0.95))',
            border: interval === 'year'
              ? '1px solid rgba(34,211,238,0.4)'
              : '1px solid rgba(34,211,238,0.25)',
          }}
        >
          {/* Badge */}
          {interval === 'year' && (
            <div className="flex justify-end mb-2">
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}
              >
                ✨ BEST VALUE
              </span>
            </div>
          )}

          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-cyan-400" />
              <span className="font-display text-lg font-bold text-text-primary">Pro</span>
            </div>
            <div className="text-right">
              {priceRow ? (
                <>
                  {/* Strikethrough anchor price */}
                  {PRICE_ANCHORS[interval] && (
                    <div className="text-xs text-text-muted line-through">
                      {PRICE_ANCHORS[interval]}
                    </div>
                  )}
                  <div className="font-display text-2xl font-bold text-text-primary">
                    {formatAmount(priceRow.amountMinor, priceRow.currency)}
                  </div>
                  <div className="text-xs text-text-muted">
                    {interval === 'year'
                      ? `per year (${formatAmount(Math.floor(priceRow.amountMinor / 12), priceRow.currency)}/mo)`
                      : interval === 'week'
                      ? 'per week'
                      : 'per month'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-text-muted italic">Loading…</div>
              )}
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-1.5 mb-5">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                <Check size={13} className="mt-0.5 shrink-0 text-cyan-400" />
                {f}
              </li>
            ))}
          </ul>

          {/* CTA */}
          {isCurrentPro ? (
            <div
              className="w-full rounded-xl py-2.5 text-center text-sm font-semibold"
              style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee' }}
            >
              Current Plan
            </div>
          ) : (
            <div className="space-y-2">
              {/* Primary: trial CTA (if eligible) */}
              {!hasUsedTrial && interval !== 'week' ? (
                <button
                  onClick={() => void handleSubscribe(lookupKey, true)}
                  disabled={isLoadingPro || !priceRow}
                  className="w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)', color: '#0a1628' }}
                >
                  {isLoadingPro ? 'Redirecting…' : 'Start 3-Day Free Trial'}
                </button>
              ) : (
                <button
                  onClick={() => void handleSubscribe(lookupKey, false)}
                  disabled={isLoadingPro || !priceRow}
                  className="w-full rounded-xl py-3 text-sm font-bold transition-opacity disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)', color: '#0a1628' }}
                >
                  {isLoadingPro ? 'Redirecting…' : 'Get Pro'}
                </button>
              )}
              {!hasUsedTrial && interval !== 'week' && (
                <p className="text-xs text-text-muted text-center">
                  {priceRow ? `${formatAmount(priceRow.amountMinor, priceRow.currency)}/${interval === 'year' ? 'yr' : 'mo'} after · Cancel anytime` : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Free plan features summary */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(51,65,85,0.35)',
            border: '1px solid rgba(148,163,184,0.12)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-slate-400" />
            <span className="font-display text-base font-semibold text-text-secondary">Free — Always</span>
          </div>
          <ul className="space-y-1.5">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                <Check size={13} className="mt-0.5 shrink-0 text-slate-500" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Advisor credit packs */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Coins size={14} className="text-amber-400" />
            <h2 className="font-display text-base font-bold text-text-primary">
              Advisor Chat Credits
            </h2>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Chat with AI advisors. 1 credit = 1 message exchange. Available on all plans.
          </p>
          <div className="space-y-2">
            {CREDIT_PACK_DEFS.map((def) => {
              const priceRow = prices.find((p) => p.lookupKey === def.lookupKey)
              const displayPrice = priceRow
                ? formatAmount(priceRow.amountMinor, priceRow.currency)
                : null
              const perCredit = priceRow
                ? `${formatAmount(Math.round(priceRow.amountMinor / def.credits), priceRow.currency)}/credit${def.popular ? ' — Save 25%' : ''}`
                : ''
              return (
                <div
                  key={def.lookupKey}
                  className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                  style={{
                    background: def.popular ? 'rgba(245,158,11,0.08)' : 'rgba(15,30,53,0.82)',
                    border: def.popular
                      ? '1px solid rgba(245,158,11,0.3)'
                      : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold text-text-primary">
                        {def.credits} Credits
                      </span>
                      {def.popular && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400">
                          ⭐ Best Value
                        </span>
                      )}
                    </div>
                    {perCredit && <div className="text-xs text-text-muted">{perCredit}</div>}
                  </div>
                  <button
                    onClick={() => void handleSubscribe(def.lookupKey, false)}
                    disabled={loading === def.lookupKey || !priceRow}
                    className="shrink-0 text-sm font-bold px-4 py-2 rounded-xl transition-opacity disabled:opacity-50"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                  >
                    {loading === def.lookupKey ? '…' : (displayPrice ?? '—')}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* Free plan note */}
        {activePlanCode === 'free' && (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: 'rgba(15,30,53,0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p className="text-xs text-text-muted text-center">
              You&apos;re on the <span className="text-text-secondary">Free plan</span>.
              Upgrade anytime — cancel anytime. No hidden fees.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
