'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { MoonPhaseDisplay } from './moon-phase-display'
import type { MoonPhaseData } from '@/types'

interface MoonCardProps {
  phase: MoonPhaseData
}

export function MoonCard({ phase }: MoonCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        className="mx-4 rounded-2xl p-4 overflow-hidden relative"
        style={{
          background:
            'linear-gradient(135deg, rgba(20,40,70,0.9) 0%, rgba(10,22,40,0.95) 100%)',
          border: '1px solid rgba(148,163,184,0.15)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 40px rgba(148,163,184,0.04)',
        }}
      >
        {/* Background starfield image */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <Image
            src="/assets/decorative/stars.png"
            alt=""
            fill
            className="object-cover opacity-20"
            aria-hidden
          />
        </div>

        <div className="flex items-start gap-4 relative">
          {/* Moon SVG */}
          <div className="moon-glow shrink-0">
            <MoonPhaseDisplay
              illumination={phase.illumination}
              isWaxing={phase.isWaxing}
              size={100}
            />
          </div>

          {/* Info */}
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-sm font-semibold text-text-primary">
                {phase.name}
              </h3>
              <Badge variant="now">Now</Badge>
            </div>
            <p className="text-xs text-text-muted mb-2">
              {format(new Date(phase.startDate), 'MMM d')} — {format(new Date(phase.endDate), 'MMM d')}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {phase.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/8 border border-white/10 px-2 py-0.5 text-[10px] text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen(true)}
              className="text-xs"
            >
              Read more
            </Button>
          </div>
        </div>

        {/* Illumination bar */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[11px] text-text-muted font-display w-20">Illuminated</span>
          <div className="flex-1 h-1 rounded-full bg-midnight-700/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-slate-400 to-white progress-animate"
              style={{ '--progress-width': `${phase.illumination}%` } as React.CSSProperties}
            />
          </div>
          <span className="text-[11px] text-text-secondary font-display">{phase.illumination}%</span>
        </div>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={phase.name}>
        <div className="space-y-5">
          <div className="flex justify-center">
            <div className="moon-glow">
              <MoonPhaseDisplay
                illumination={phase.illumination}
                isWaxing={phase.isWaxing}
                size={130}
              />
            </div>
          </div>

          <div className="text-center">
            <Badge variant="now" className="mb-2">Active Now</Badge>
            <p className="text-xs text-text-muted">
              {format(new Date(phase.startDate), 'MMM d')} — {format(new Date(phase.endDate), 'MMM d, yyyy')}
            </p>
          </div>

          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] font-display font-semibold text-text-muted uppercase tracking-widest mb-2">
              Phase meaning
            </p>
            <p className="text-sm leading-relaxed text-text-secondary">
              {phase.phaseInterpretation}
            </p>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}

