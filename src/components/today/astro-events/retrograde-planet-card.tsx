'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { PLANET_COLORS, PLANET_GLYPHS } from '@/lib/constants'
import type { Retrograde } from '@/types'

interface RetrogradePlanetCardProps {
  retrograde: Retrograde
}

export function RetrogradePlanetCard({ retrograde }: RetrogradePlanetCardProps) {
  const [open, setOpen] = useState(false)
  const planetColor = PLANET_COLORS[retrograde.planet] ?? '#94A3B8'
  const glyph = PLANET_GLYPHS[retrograde.planet] ?? retrograde.planet[0]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card-interactive rounded-2xl p-4 flex gap-4 w-full text-left items-center"
        style={{
          '--planet-color': `${planetColor}80`,
          '--planet-color-dim': `${planetColor}30`,
        } as React.CSSProperties}
      >
        {/* Planet orb with glow */}
        <div
          className="relative shrink-0 h-[72px] w-[72px] rounded-full planet-glow"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${planetColor}40 0%, ${planetColor}10 50%, rgba(10,22,40,0.95) 100%)`,
            border: `1px solid ${planetColor}30`,
          }}
        >
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: planetColor }}>
              {glyph}
            </span>
          </div>
          {/* Atmospheric ring */}
          <div
            className="absolute inset-[-4px] rounded-full opacity-20"
            style={{ border: `2px solid ${planetColor}` }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-sm font-semibold text-text-primary">
              {retrograde.planet} Retrograde
            </h3>
            {retrograde.isActive && <Badge variant="now">NOW</Badge>}
          </div>
          <p className="text-xs text-text-muted mb-2 font-display">
            in {retrograde.sign}
          </p>
          <p className="text-xs text-text-muted">
            {format(new Date(retrograde.startDate), 'MMM d')} — {format(new Date(retrograde.endDate), 'MMM d')}
          </p>
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {retrograde.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/8 bg-midnight-700/50 px-2 py-0.5 text-[10px] text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`${retrograde.planet} Retrograde`}
      >
        <div className="space-y-4">
          {/* Large planet visual */}
          <div className="flex justify-center">
            <div
              className="h-28 w-28 rounded-full planet-glow flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${planetColor}35 0%, ${planetColor}08 55%, rgba(10,22,40,0.98) 100%)`,
                border: `1px solid ${planetColor}30`,
                '--planet-color': `${planetColor}80`,
                '--planet-color-dim': `${planetColor}30`,
              } as React.CSSProperties}
            >
              <span className="text-4xl font-bold" style={{ color: planetColor }}>{glyph}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {format(new Date(retrograde.startDate), 'MMM d')} — {format(new Date(retrograde.endDate), 'MMM d, yyyy')}
            </span>
            {retrograde.isActive && <Badge variant="now">Active Now</Badge>}
          </div>

          <div className="glass-card rounded-xl p-4">
            <p className="text-sm leading-relaxed text-text-secondary">
              {retrograde.interpretation}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {retrograde.tags.map((tag) => (
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
