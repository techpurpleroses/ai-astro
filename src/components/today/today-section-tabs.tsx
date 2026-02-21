'use client'

import { cn } from '@/lib/utils'

type TodaySection = 'horoscope' | 'events' | 'moon'

interface TodaySectionTabsProps {
  active: TodaySection
  onChange: (section: TodaySection) => void
}

const TABS: { id: TodaySection; label: string }[] = [
  { id: 'horoscope', label: 'Horoscope' },
  { id: 'events',    label: 'Astro Events' },
  { id: 'moon',      label: 'Moon' },
]

export function TodaySectionTabs({ active, onChange }: TodaySectionTabsProps) {
  return (
    <div className="flex gap-2 px-4 py-3">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 rounded-full py-2 text-xs font-display font-semibold',
            'transition-all duration-200 focus-visible:outline-none',
            active === tab.id
              ? 'bg-cyan-glow text-midnight-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'bg-midnight-800/60 text-text-secondary border border-white/8 active:bg-midnight-700',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
