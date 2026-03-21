'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { useHoroscope } from '@/hooks/use-horoscope'
import { useTransits } from '@/hooks/use-transits'
import { useUserProfile } from '@/hooks/use-profile'
import { SkeletonCard } from '@/components/ui/skeleton'
import { ZODIAC_NAMES } from '@/lib/constants'
import { SectionHeroCard } from '@/components/today/shared/section-hero-card'

export function YourHoroscopeCard() {
  const [detailOpen, setDetailOpen] = useState(false)
  const { data: profile } = useUserProfile()
  const { data: reading, isLoading } = useHoroscope()
  const { data: transits } = useTransits()
  const signName = profile?.sunSign ? (ZODIAC_NAMES[profile.sunSign as keyof typeof ZODIAC_NAMES] ?? profile.sunSign) : null
  const transitCount = (transits?.shortTerm?.length ?? 0) + (transits?.longTerm?.length ?? 0)

  if (isLoading) return <SkeletonCard className="mx-4" />

  return (
    <>
      <div className="px-4">
        <SectionHeroCard
          backgroundImage="/assets/today/horoscope/horoscope-card-bg.png"
          backgroundAlt="Horoscope"
          borderColor="rgba(132,204,22,0.3)"
          overlayClassName="from-[#031b32]/86 via-[#031b32]/56 to-[#031b32]/90"
          contentClassName="pb-4"
        >
          <p className="text-[11px] text-slate-300 mb-1">{signName ?? 'Your Sign'}</p>
          <h3 className="font-display text-[40px] leading-none font-bold text-white mb-2">Your Horoscope</h3>

          {transitCount > 0 && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
              style={{ background: 'rgba(107,114,128,0.5)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <div className="flex -space-x-1">
                <span className="h-3 w-3 rounded-full bg-cyan-300/80 border border-white/20" />
                <span className="h-3 w-3 rounded-full bg-amber-300/80 border border-white/20" />
                <span className="h-3 w-3 rounded-full bg-slate-200/80 border border-white/20" />
              </div>
              <span className="text-[10px] font-display font-semibold text-white">
                Transits influencing: {transitCount}
              </span>
            </div>
          )}

          {reading ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[14px] font-display font-bold text-lime-300 mb-1">Focus</p>
                  {(reading.opportunities ?? []).slice(0, 3).map((item: string) => (
                    <p key={item} className="text-[12px] text-lime-100 leading-snug mb-0.5">{item}</p>
                  ))}
                </div>
                <div>
                  <p className="text-[14px] font-display font-bold text-rose-300 mb-1">Troubles</p>
                  {(reading.challenges ?? []).slice(0, 3).map((item: string) => (
                    <p key={item} className="text-[12px] text-rose-100 leading-snug mb-0.5">{item}</p>
                  ))}
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setDetailOpen(true)}
                className="!text-midnight-950 !font-display !font-semibold"
                style={{ background: 'linear-gradient(135deg, #84CC16, #65A30D)' }}
              >
                Read more
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-300 italic">No reading available for today.</p>
          )}
        </SectionHeroCard>
      </div>

      {reading && (
        <BottomSheet open={detailOpen} onClose={() => setDetailOpen(false)} title={reading.title}>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-text-secondary">{reading.text}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.15)' }}>
                <p className="text-[9px] font-display font-bold text-lime-accent uppercase tracking-widest mb-2">Focus</p>
                {(reading.opportunities ?? []).map((item: string) => (
                  <p key={item} className="text-[11px] text-lime-accent leading-snug mb-1">* {item}</p>
                ))}
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-[9px] font-display font-bold text-rose-400 uppercase tracking-widest mb-2">Troubles</p>
                {(reading.challenges ?? []).map((item: string) => (
                  <p key={item} className="text-[11px] text-rose-400 leading-snug mb-1">* {item}</p>
                ))}
              </div>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
