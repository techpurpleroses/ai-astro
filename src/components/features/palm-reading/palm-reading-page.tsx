'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Camera } from 'lucide-react'

// ── Palm SVG illustration ─────────────────────────────────────────────────────

function PalmIllustration({ hand }: { hand: 'left' | 'right' }) {
  // SVG hand outline with key palm lines
  const isMirrored = hand === 'right'

  return (
    <svg
      viewBox="0 0 200 280"
      className="w-full max-w-[200px] mx-auto"
      style={{ transform: isMirrored ? 'scaleX(-1)' : undefined }}
    >
      {/* Palm outline */}
      <path
        d="M 60 260 Q 30 250 28 210 L 25 155 Q 24 140 32 138 L 36 138 Q 40 100 42 80 Q 43 68 52 68 Q 61 68 62 80 L 63 95
           M 63 95 L 63 60 Q 63 48 72 48 Q 81 48 82 60 L 82 88
           M 82 88 L 82 52 Q 82 40 91 40 Q 100 40 101 52 L 101 84
           M 101 84 L 101 58 Q 101 46 110 46 Q 119 46 120 58 L 120 92
           M 120 92 Q 138 95 148 115 L 158 155 Q 165 175 160 200 Q 155 230 140 248 Q 120 265 95 268 Q 75 270 60 260"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Heart line (rose) */}
      <path
        d="M 42 120 Q 65 112 85 115 Q 105 118 128 108"
        fill="none"
        stroke="#F43F5E"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.8}
      />

      {/* Head line (cyan) */}
      <path
        d="M 44 145 Q 70 138 95 142 Q 118 146 138 138"
        fill="none"
        stroke="#06B6D4"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.8}
      />

      {/* Life line (lime) */}
      <path
        d="M 70 90 Q 52 120 48 160 Q 45 195 55 225"
        fill="none"
        stroke="#84CC16"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.8}
      />

      {/* Fate line (gold) */}
      <path
        d="M 90 240 Q 88 200 90 165 Q 92 130 95 100"
        fill="none"
        stroke="#F59E0B"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.7}
        strokeDasharray="4 3"
      />

      {/* Glow overlay on lines */}
      <path
        d="M 42 120 Q 65 112 85 115 Q 105 118 128 108"
        fill="none"
        stroke="#F43F5E"
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.1}
      />
      <path
        d="M 44 145 Q 70 138 95 142 Q 118 146 138 138"
        fill="none"
        stroke="#06B6D4"
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.1}
      />
      <path
        d="M 70 90 Q 52 120 48 160 Q 45 195 55 225"
        fill="none"
        stroke="#84CC16"
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.1}
      />
    </svg>
  )
}

// ── Metric bar ────────────────────────────────────────────────────────────────

const METRICS = [
  { label: 'Sensitivity',  value: 78, color: '#F43F5E', line: 'Heart Line',  description: 'Your empathic nature runs deep. You feel others\' emotions as if they were your own — a rare and powerful gift.' },
  { label: 'Longevity',    value: 85, color: '#84CC16', line: 'Life Line',   description: 'Strong vitality and resilience. Your life force is robust, supporting long-term health and physical endurance.' },
  { label: 'Intelligence', value: 92, color: '#06B6D4', line: 'Head Line',   description: 'Exceptional analytical depth. Your head line suggests a naturally gifted mind with strong problem-solving intuition.' },
  { label: 'Ambition',     value: 71, color: '#F59E0B', line: 'Fate Line',   description: 'A steady drive toward your goals. Your fate line shows purposeful movement — you build your destiny step by step.' },
]

function MetricBar({
  label, value, color, line, description, delay,
}: typeof METRICS[0] & { delay: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="glass-card rounded-xl p-3">
      <button
        className="w-full"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: color }} />
            <span className="font-display text-sm font-semibold text-text-primary">{label}</span>
            <span className="text-[9px] text-text-muted">{line}</span>
          </div>
          <span className="font-display text-sm font-bold" style={{ color }}>{value}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/8 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.9, delay, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(90deg, ${color}80, ${color})`,
              boxShadow: `0 0 8px ${color}50`,
            }}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-text-secondary leading-relaxed mt-2 pt-2 border-t border-white/6">
              {description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function LineLegend() {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {[
        { label: 'Heart', color: '#F43F5E' },
        { label: 'Head',  color: '#06B6D4' },
        { label: 'Life',  color: '#84CC16' },
        { label: 'Fate',  color: '#F59E0B' },
      ].map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <div className="h-2 w-5 rounded-full" style={{ background: color }} />
          {label} Line
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PalmReadingClient() {
  const router = useRouter()
  const [hand, setHand] = useState<'left' | 'right'>('left')

  return (
    <div className="flex flex-col">
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
          <ArrowLeft size={15} className="text-text-secondary" />
        </button>
        <div>
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">FEATURES</p>
          <h1 className="font-display text-base font-bold text-text-primary">Palm Reading</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-5">

        {/* Hand toggle */}
        <div className="flex gap-2">
          {(['left', 'right'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setHand(h)}
              className="flex-1 py-2 rounded-full text-xs font-display font-semibold capitalize transition-all"
              style={{
                color: hand === h ? '#F43F5E' : '#4E6179',
                background: hand === h ? 'rgba(244,63,94,0.12)' : 'rgba(255,255,255,0.04)',
                border: hand === h ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {h} Hand
            </button>
          ))}
        </div>

        {/* Palm SVG */}
        <div
          className="rounded-3xl p-6 flex flex-col items-center gap-3"
          style={{ background: 'rgba(15,30,53,0.7)', border: '1px solid rgba(244,63,94,0.1)' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={hand}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <PalmIllustration hand={hand} />
            </motion.div>
          </AnimatePresence>
          <LineLegend />
        </div>

        {/* Metrics */}
        <div className="space-y-2.5">
          <h2 className="font-display text-sm font-semibold text-text-primary">Your Palm Analysis</h2>
          {METRICS.map((metric, i) => (
            <MetricBar key={metric.label} {...metric} delay={0.1 * i} />
          ))}
        </div>

        {/* Camera CTA */}
        <button
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-display text-sm font-semibold transition-all active:scale-98"
          style={{
            background: 'linear-gradient(135deg, rgba(244,63,94,0.2), rgba(244,63,94,0.08))',
            border: '1px solid rgba(244,63,94,0.3)',
            color: '#F43F5E',
          }}
        >
          <Camera size={17} />
          Scan Your Palm (Coming Soon)
        </button>
      </div>
    </div>
  )
}
