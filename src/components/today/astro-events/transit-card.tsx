'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { PLANET_GLYPHS, PLANET_COLORS, ASPECT_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Transit } from '@/types'

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '☌',
  opposition:  '☍',
  trine:       '△',
  square:      '□',
  sextile:     '⚹',
  quincunx:    '⚻',
}

const INTENSITY_VARIANT = {
  high:   'cyan',
  medium: 'lime',
  low:    'muted',
} as const

interface TransitCardProps {
  transit: Transit
  compact?: boolean
}

export function TransitCard({ transit, compact = false }: TransitCardProps) {
  const [open, setOpen] = useState(false)

  const p1Color = PLANET_COLORS[transit.transitingPlanet] ?? '#94A3B8'
  const p2Color = PLANET_COLORS[transit.natalPlanet]      ?? '#94A3B8'
  const aspectColor = ASPECT_COLORS[transit.aspect]       ?? 'rgba(148,163,184,0.5)'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card-interactive rounded-xl p-3.5 w-full text-left"
      >
        <div className="flex items-start gap-3">
          {/* Aspect visual */}
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
            <span style={{ color: p1Color }} className="text-sm font-bold leading-none">
              {PLANET_GLYPHS[transit.transitingPlanet] ?? transit.transitingPlanet[0]}
            </span>
            <span style={{ color: aspectColor }} className="text-[10px] leading-none">
              {ASPECT_SYMBOLS[transit.aspect] ?? '·'}
            </span>
            <span style={{ color: p2Color }} className="text-sm font-bold leading-none">
              {PLANET_GLYPHS[transit.natalPlanet] ?? transit.natalPlanet[0]}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-display text-xs font-semibold text-text-primary truncate">
                {transit.title}
              </h4>
              <Badge variant={INTENSITY_VARIANT[transit.intensity]}>
                {transit.intensity}
              </Badge>
            </div>

            {!compact && (
              <p className="text-xs leading-relaxed text-text-secondary line-clamp-2">
                {transit.interpretation}
              </p>
            )}

            <div className="flex flex-wrap gap-1 mt-2">
              {transit.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-midnight-700/60 border border-white/8 px-2 py-0.5 text-[10px] text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-[10px] text-text-muted mt-1.5">
              {format(new Date(transit.startDate), 'MMM d')} — {format(new Date(transit.endDate), 'MMM d')}
            </p>
          </div>
        </div>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={transit.title}>
        <div className="space-y-4">
          {/* Planets visual */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <span style={{ color: p1Color }} className="text-3xl font-bold">
                {PLANET_GLYPHS[transit.transitingPlanet] ?? transit.transitingPlanet[0]}
              </span>
              <span className="text-[11px] text-text-muted font-display">{transit.transitingPlanet}</span>
            </div>
            <div className="flex flex-col items-center">
              <span style={{ color: aspectColor }} className="text-2xl">{ASPECT_SYMBOLS[transit.aspect]}</span>
              <span className="text-[10px] text-text-muted font-display capitalize">{transit.aspect}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span style={{ color: p2Color }} className="text-3xl font-bold">
                {PLANET_GLYPHS[transit.natalPlanet] ?? transit.natalPlanet[0]}
              </span>
              <span className="text-[11px] text-text-muted font-display">natal {transit.natalPlanet}</span>
            </div>
          </div>

          {/* Date & intensity */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {format(new Date(transit.startDate), 'MMM d')} — {format(new Date(transit.endDate), 'MMM d, yyyy')}
            </span>
            <Badge variant={INTENSITY_VARIANT[transit.intensity]}>
              {transit.intensity} intensity
            </Badge>
          </div>

          {/* Interpretation */}
          <div className="glass-card rounded-xl p-4">
            <p className="text-sm leading-relaxed text-text-secondary">
              {transit.interpretation}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {transit.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-midnight-700/60 border border-white/8 px-3 py-1 text-xs text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
