'use client'

/**
 * FeatureGate — Astroline-style paywall overlay.
 *
 * Usage: wrap ONLY content AFTER the free preview (aha moment first!).
 *
 * <FeatureGate feature="birth_chart.full" title="See every planet's influence">
 *   <PlanetsTable />
 * </FeatureGate>
 *
 * When LOCKED: shows blurred preview + emotional overlay + CTA.
 * When UNLOCKED: renders children directly with no overhead.
 *
 * Session re-trigger logic (ChatGPT #5):
 * - sessionStorage tracks gates_seen counter per session
 * - After 3 dismissed gates → re-show next gate (override dismiss)
 * - localStorage tracks last dismiss date per feature → re-show after 24h
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lock } from 'lucide-react'
import { usePlan } from '@/hooks/use-plan'
import type { FeatureKey } from '@/hooks/use-plan'

// ---------------------------------------------------------------------------
// Per-feature emotional copy
// ---------------------------------------------------------------------------

const GATE_COPY: Record<FeatureKey, {
  title: string
  description: string
  preview?: string
}> = {
  'horoscope.personal': {
    title: 'The stars have a message for you',
    description: 'Your full personalized reading is ready — transits, emotional tone, and what the cosmos are steering you toward today.',
    preview: 'Venus is placing you at a crossroads between what feels safe and what truly excites you…',
  },
  'birth_chart.full': {
    title: 'See every planet\'s influence on your life',
    description: 'Your complete cosmic blueprint, decoded. Every planet, house, and aspect — what they mean for who you are.',
    preview: 'Mercury in your 3rd house reveals a mind built for connection, but there\'s a tension with…',
  },
  'compatibility.deep': {
    title: 'Discover what truly drives your connection',
    description: 'A full deep-dive into your real compatibility — not just sun signs, but the emotional undercurrents that define you together.',
    preview: 'Your Moon signs create a rare tension — magnetic but combustible. Here\'s why it feels…',
  },
  'palm.scan': {
    title: 'Your hands tell a story',
    description: 'Reveal what\'s written in your lines. Upload a palm photo and get an AI-powered reading of your fate, heart, head, and life lines.',
  },
  'soulmate.generate': {
    title: 'Meet your cosmic match',
    description: 'Generate a portrait of the person written in your stars — appearance, personality, and the connection you\'ll share.',
  },
  'tarot.modes': {
    title: 'The cards have more to reveal',
    description: 'Unlock love readings, near future spreads, and yes/no oracle — beyond the daily card.',
  },
  'prediction.report': {
    title: 'Your cosmic year ahead, decoded',
    description: 'A comprehensive AI-powered prediction report covering love, career, health, and major life themes for the year ahead — powered by your full birth chart.',
    preview: "Jupiter's shift into your 2nd house signals a major financial turning point in late 2026\u2026",
  },
}

// ---------------------------------------------------------------------------
// Session/localStorage helpers
// ---------------------------------------------------------------------------

const SESSION_KEY = 'astro_gates_seen'
const DISMISS_PREFIX = 'astro_gate_dismiss_'
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const RE_TRIGGER_AFTER = 3 // re-show after this many dismissed gates in session

function getSessionGateCount(): number {
  try {
    return parseInt(sessionStorage.getItem(SESSION_KEY) ?? '0', 10)
  } catch {
    return 0
  }
}

function incrementSessionGateCount() {
  try {
    const n = getSessionGateCount()
    sessionStorage.setItem(SESSION_KEY, String(n + 1))
  } catch {
    // ignore
  }
}

function isDismissed(feature: string): boolean {
  try {
    const raw = localStorage.getItem(`${DISMISS_PREFIX}${feature}`)
    if (!raw) return false
    const ts = parseInt(raw, 10)
    if (Date.now() - ts > DISMISS_DURATION_MS) {
      localStorage.removeItem(`${DISMISS_PREFIX}${feature}`)
      return false
    }
    // Re-trigger if user has seen RE_TRIGGER_AFTER+ gates this session
    const seenCount = getSessionGateCount()
    if (seenCount >= RE_TRIGGER_AFTER) return false
    return true
  } catch {
    return false
  }
}

function markDismissed(feature: string) {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${feature}`, String(Date.now()))
    incrementSessionGateCount()
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// FeatureGate component
// ---------------------------------------------------------------------------

interface FeatureGateProps {
  feature: FeatureKey
  children: React.ReactNode
  /** Optional: override the default title */
  title?: string
  /** Optional: override the default description */
  description?: string
}

export function FeatureGate({ feature, children, title, description }: FeatureGateProps) {
  const { canAccess, isLoading } = usePlan()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Avoid SSR mismatch — read localStorage only after mount
  useEffect(() => {
    setMounted(true)
    setDismissed(isDismissed(feature))
  }, [feature])

  const handleDismiss = useCallback(() => {
    markDismissed(feature)
    setDismissed(true)
  }, [feature])

  const handleUpgrade = useCallback(() => {
    router.push('/billing')
  }, [router])

  // While loading plan data → show children (optimistic, avoid flash of gate)
  if (isLoading || !mounted) return <>{children}</>

  // User has access → no gate
  if (canAccess(feature)) return <>{children}</>

  // User dismissed recently → show blurred children with a subtle re-open hint
  if (dismissed) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.4 }}>
          {children}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2">
          <button
            onClick={() => setDismissed(false)}
            className="text-xs text-text-muted underline underline-offset-2"
          >
            🔒 Unlock this section
          </button>
        </div>
      </div>
    )
  }

  const copy = GATE_COPY[feature]
  const gateTitle = title ?? copy.title
  const gateDesc = description ?? copy.description
  const preview = copy.preview

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-105">
      {/* Blurred preview of children underneath */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: 'blur(8px)', opacity: 0.35, maxHeight: 200, overflow: 'hidden' }}
        aria-hidden
      >
        {children}
      </div>

      {/* Bottom fade gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-20"
        style={{
          background: 'linear-gradient(to top, rgba(10,22,40,1) 40%, transparent)',
        }}
      />

      {/* Gate overlay card */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-5 py-6"
        style={{ background: 'rgba(10,22,40,0.82)' }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)' }}
        >
          <Sparkles size={18} className="text-cyan-400" />
        </div>

        {/* Headline */}
        <h3 className="font-mystical text-lg text-[#F4E2B4] text-center leading-snug mb-2">
          {gateTitle}
        </h3>

        {/* Preview blurred teaser */}
        {preview && (
          <p
            className="text-xs text-text-muted text-center italic mb-2 px-2 leading-relaxed"
            style={{ filter: 'blur(3px)', userSelect: 'none' }}
          >
            {preview}
          </p>
        )}

        {/* Description */}
        <p className="text-xs text-text-secondary text-center mb-5 leading-relaxed px-2">
          {gateDesc}
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleUpgrade}
          className="w-full max-w-xs rounded-xl py-3 text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #06b6d4)', color: '#0a1628' }}
        >
          Start 3-Day Free Trial
        </button>
        <p className="text-xs text-text-muted mt-1.5">$19.99/mo after · Cancel anytime</p>

        {/* Secondary dismiss */}
        <button
          onClick={handleDismiss}
          className="mt-3 text-xs text-text-muted"
        >
          Maybe later
        </button>
      </div>

      {/* Lock badge top-right */}
      <div className="absolute top-3 right-3">
        <div
          className="flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <Lock size={10} className="text-amber-400" />
          <span className="text-[10px] font-bold text-amber-400">PRO</span>
        </div>
      </div>
    </div>
  )
}
