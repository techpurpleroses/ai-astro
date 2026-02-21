'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { GlassCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateStrip } from './date-strip'
import { useHoroscope } from '@/hooks/use-horoscope'
import { SkeletonCard } from '@/components/ui/skeleton'
import { ZODIAC_NAMES, DEFAULT_SIGN } from '@/lib/constants'

export function YourHoroscopeCard() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [detailOpen, setDetailOpen] = useState(false)

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: reading, isLoading } = useHoroscope(dateStr)

  if (isLoading) return <SkeletonCard className="mx-4" />

  return (
    <>
      <GlassCard padding="none" className="mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden"
              style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.2), rgba(6,182,212,0.04))', border: '1px solid rgba(6,182,212,0.25)' }}
            >
              <Image src={`/zodiac/${DEFAULT_SIGN}.png`} alt={ZODIAC_NAMES[DEFAULT_SIGN]} width={40} height={40} className="object-cover" />
            </div>
            <div>
              <p className="font-display text-xs text-text-muted uppercase tracking-wide">Your horoscope</p>
              <h3 className="font-display text-sm font-semibold text-text-primary">{ZODIAC_NAMES[DEFAULT_SIGN]}</h3>
            </div>
          </div>
          {/* Transits influencing badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}
          >
            <span className="text-[9px] font-display text-text-muted">Transits:</span>
            <span className="text-[12px] font-display font-bold text-cyan-glow">4</span>
          </div>
        </div>

        {/* Date strip */}
        <div className="px-3 pb-3">
          <DateStrip selected={selectedDate} onSelect={setSelectedDate} />
        </div>

        {/* Reading content */}
        <AnimatePresence mode="wait">
          <motion.div key={dateStr}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-4"
          >
            {reading ? (
              <>
                <h4 className="font-mystical text-sm font-bold text-text-primary mb-1.5">{reading.title}</h4>
                <p className="text-xs leading-relaxed text-text-secondary mb-3">{reading.text}</p>

                {/* Focus & Troubles two-column layout */}
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <div className="rounded-xl p-2.5" style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.15)' }}>
                    <p className="text-[9px] font-display font-bold text-lime-accent uppercase tracking-widest mb-1.5">Focus</p>
                    {(reading.opportunities ?? []).slice(0, 3).map((item: string) => (
                      <p key={item} className="text-[10px] text-lime-accent leading-snug mb-0.5">• {item}</p>
                    ))}
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p className="text-[9px] font-display font-bold text-rose-400 uppercase tracking-widest mb-1.5">Troubles</p>
                    {(reading.challenges ?? []).slice(0, 3).map((item: string) => (
                      <p key={item} className="text-[10px] text-rose-400 leading-snug mb-0.5">• {item}</p>
                    ))}
                  </div>
                </div>

                <Button variant="secondary" size="sm" fullWidth onClick={() => setDetailOpen(true)}>
                  Read more
                </Button>
              </>
            ) : (
              <p className="text-sm text-text-muted italic">No reading available for this date.</p>
            )}
          </motion.div>
        </AnimatePresence>
      </GlassCard>

      {/* Detail bottom sheet */}
      {reading && (
        <BottomSheet open={detailOpen} onClose={() => setDetailOpen(false)} title={reading.title}>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-text-secondary">{reading.text}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.15)' }}>
                <p className="text-[9px] font-display font-bold text-lime-accent uppercase tracking-widest mb-2">Focus</p>
                {(reading.opportunities ?? []).map((item: string) => (
                  <p key={item} className="text-[11px] text-lime-accent leading-snug mb-1">• {item}</p>
                ))}
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-[9px] font-display font-bold text-rose-400 uppercase tracking-widest mb-2">Troubles</p>
                {(reading.challenges ?? []).map((item: string) => (
                  <p key={item} className="text-[11px] text-rose-400 leading-snug mb-1">• {item}</p>
                ))}
              </div>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
