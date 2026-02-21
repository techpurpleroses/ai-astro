'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useAlternativeHoroscope } from '@/hooks/use-horoscope'
import { cn } from '@/lib/utils'
import type { HoroscopeCategory } from '@/types'

const TABS: { id: HoroscopeCategory; label: string; emoji: string }[] = [
  { id: 'your-day', label: 'Your Day', emoji: '☀️' },
  { id: 'love',     label: 'Love',     emoji: '♥' },
  { id: 'health',   label: 'Health',   emoji: '✦' },
  { id: 'career',   label: 'Career',   emoji: '★' },
]

export function AlternativeHoroscope() {
  const [activeTab, setActiveTab] = useState<HoroscopeCategory>('your-day')
  const { data, isLoading } = useAlternativeHoroscope()

  if (isLoading) return <SkeletonCard className="mx-4" />

  const reading = data?.[activeTab]

  return (
    <GlassCard padding="none" className="mx-4 overflow-hidden">
      {/* Tab row */}
      <div className="flex border-b border-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 py-3 text-[11px] font-display font-semibold transition-colors duration-150',
              activeTab === tab.id
                ? 'text-cyan-glow border-b-2 border-cyan-glow -mb-px'
                : 'text-text-muted',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {reading && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {/* Star rating */}
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < reading.rating ? 'text-gold-accent fill-gold-accent' : 'text-text-muted'}
                />
              ))}
              <span className="ml-1 text-xs text-text-muted font-display">{reading.rating}/5</span>
            </div>

            <p className="text-sm leading-relaxed text-text-secondary mb-3">
              {reading.text}
            </p>

            {/* Keywords */}
            <div className="flex flex-wrap gap-1.5">
              {reading.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-midnight-700/60 border border-white/8 px-2.5 py-0.5 text-[11px] font-medium text-text-secondary"
                >
                  {kw}
                </span>
              ))}
            </div>

            {/* Feedback row */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-text-muted">Was this useful?</span>
              <div className="flex gap-2">
                {['👍', '❤️', '😲', '😢'].map((emoji) => (
                  <button
                    key={emoji}
                    className="text-base transition-transform active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
