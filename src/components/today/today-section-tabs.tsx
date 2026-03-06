'use client'

import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type TodaySection = 'horoscope' | 'events' | 'moon'

interface TodaySectionTabsProps {
  active: TodaySection
  onChange: (section: TodaySection) => void
}

const TABS: { id: TodaySection; label: string }[] = [
  { id: 'horoscope', label: 'Horoscope' },
  { id: 'events', label: 'Astro Events' },
  { id: 'moon', label: 'Moon' },
]

export function TodaySectionTabs({ active, onChange }: TodaySectionTabsProps) {
  const activeStyle: Record<TodaySection, CSSProperties> = {
    horoscope: { background: 'linear-gradient(135deg, rgba(132,204,22,0.96), rgba(101,163,13,0.96))' },
    events: { background: 'linear-gradient(135deg, rgba(34,211,238,0.96), rgba(20,184,166,0.96))' },
    moon: { background: 'linear-gradient(135deg, rgba(230,196,79,0.96), rgba(184,145,46,0.96))' },
  }

  return (
    <div className="px-4 py-2.5">
      <div
        className="flex gap-1.5 rounded-2xl p-1"
        style={{ background: 'rgba(8,20,38,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex-1 overflow-hidden rounded-xl py-2 text-xs font-display font-semibold transition-all duration-200 focus-visible:outline-none',
              active === tab.id ? 'text-[#F4FAFF]' : 'text-text-secondary active:bg-white/6',
            )}
          >
            {active === tab.id && (
              <motion.span
                layoutId="today-tab-pill"
                className="absolute inset-0 rounded-xl"
                style={activeStyle[tab.id]}
                transition={{ type: 'spring', stiffness: 460, damping: 34, mass: 0.75 }}
              />
            )}
            <span className={cn('relative z-10', active === tab.id && 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]')}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
