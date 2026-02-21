'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { MoonPhaseDisplay } from './moon-phase-display'
import { ZODIAC_GLYPHS, ZODIAC_NAMES, ELEMENT_COLORS, ZODIAC_ELEMENTS } from '@/lib/constants'
import type { MoonPhaseData } from '@/types'

interface MoonInSignCardProps {
  phase: MoonPhaseData
}

export function MoonInSignCard({ phase }: MoonInSignCardProps) {
  const [open, setOpen] = useState(false)
  const elementColor = ELEMENT_COLORS[ZODIAC_ELEMENTS[phase.sign]]

  return (
    <>
      <div
        className="mx-4 rounded-2xl p-4 overflow-hidden relative"
        style={{
          background: `linear-gradient(135deg, rgba(20,40,70,0.85), rgba(10,22,40,0.95))`,
          border: `1px solid ${elementColor}25`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 30px ${elementColor}08`,
        }}
      >
        <div className="flex items-start gap-4">
          {/* Moon + zodiac overlay */}
          <div className="relative shrink-0">
            <div className="moon-glow">
              <MoonPhaseDisplay
                illumination={phase.illumination}
                isWaxing={phase.isWaxing}
                size={90}
              />
            </div>
            {/* Zodiac glyph overlay */}
            <div
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full flex items-center justify-center text-base font-bold"
              style={{
                background: `radial-gradient(circle, ${elementColor}30, ${elementColor}0a)`,
                border: `1px solid ${elementColor}40`,
                color: elementColor,
              }}
            >
              {ZODIAC_GLYPHS[phase.sign]}
            </div>
          </div>

          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-sm font-semibold text-text-primary">
                Moon in {ZODIAC_NAMES[phase.sign]}
              </h3>
              <Badge variant="now">Now</Badge>
            </div>

            <p className="text-xs text-text-muted mb-2">
              {format(new Date(phase.startDate), 'MMM d')} — {format(new Date(phase.endDate), 'MMM d')}
            </p>

            {/* Sign tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {['Intuition', 'Depth', 'Transformation'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>

            <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="text-xs">
              Read more
            </Button>
          </div>
        </div>
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Moon in ${ZODIAC_NAMES[phase.sign]}`}
      >
        <div className="space-y-4">
          <div className="flex justify-center gap-4 items-center">
            <MoonPhaseDisplay illumination={phase.illumination} isWaxing={phase.isWaxing} size={90} />
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold"
              style={{
                background: `radial-gradient(circle, ${elementColor}25, ${elementColor}05)`,
                border: `1px solid ${elementColor}35`,
                color: elementColor,
              }}
            >
              {ZODIAC_GLYPHS[phase.sign]}
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <p className="text-sm leading-relaxed text-text-secondary">
              {phase.signInterpretation}
            </p>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
