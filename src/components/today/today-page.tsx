'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { Bell } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { TodaySectionTabs } from './today-section-tabs'
import { HoroscopeSection } from './horoscope/horoscope-section'
import { AstroEventsSection } from './astro-events/astro-events-section'
import { MoonSection } from './moon/moon-section'
import { Avatar } from '@/components/ui/avatar'

type TodaySection = 'horoscope' | 'events' | 'moon'

function isValidSection(s: string | null): s is TodaySection {
  return s === 'horoscope' || s === 'events' || s === 'moon'
}

export function TodayClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section')
  const activeSection: TodaySection = isValidSection(sectionParam) ? sectionParam : 'horoscope'

  const handleSectionChange = useCallback(
    (section: TodaySection) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('section', section)
      router.replace(`/today?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const today = new Date()

  return (
    <div className="flex flex-col">
      {/* ── Page Header ── */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div>
          <p className="font-mystical text-xs text-text-muted tracking-widest">
            {format(today, 'EEEE').toUpperCase()}
          </p>
          <h1 className="font-display text-lg font-bold text-text-primary leading-tight">
            {format(today, 'MMMM d, yyyy')}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-midnight-800/60 border border-white/8 text-text-muted transition-colors active:text-cyan-glow">
            <Bell size={17} />
            {/* Notification dot */}
            <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-accent" />
          </button>
          <Avatar name="Astro User" size="sm" />
        </div>
      </div>

      {/* ── Section tabs ── */}
      <TodaySectionTabs active={activeSection} onChange={handleSectionChange} />

      {/* ── Section content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {activeSection === 'horoscope' && <HoroscopeSection />}
          {activeSection === 'events'    && <AstroEventsSection />}
          {activeSection === 'moon'      && <MoonSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
