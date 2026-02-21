'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { PLANET_COLORS } from '@/lib/constants'

interface BigThreeEntry {
  planet: string
  sign: string
  house: number
  glyph: string
  color: string
  roleLabel: string
  description: string
}

interface BigThreeCardProps {
  sun: { sign: string; degree: number; glyph: string }
  moon: { sign: string; degree: number; glyph: string }
  ascendant: { sign: string; degree: number; glyph: string }
}

export function BigThreeCard({ sun, moon, ascendant }: BigThreeCardProps) {
  const [selected, setSelected] = useState<BigThreeEntry | null>(null)

  const entries: BigThreeEntry[] = [
    {
      planet: 'Sun',
      sign: sun.sign,
      house: 9,
      glyph: sun.glyph,
      color: PLANET_COLORS['Sun'] ?? '#F59E0B',
      roleLabel: 'Your inner self',
      description: `Your core identity and life force shines through ${sun.sign}. This is the essence of who you are — your ego, will, and the solar energy that drives your life purpose forward.`,
    },
    {
      planet: 'Moon',
      sign: moon.sign,
      house: 5,
      glyph: moon.glyph,
      color: PLANET_COLORS['Moon'] ?? '#94A3B8',
      roleLabel: 'Your emotional side',
      description: `Your emotional world and instinctive reactions are shaped by ${moon.sign}. This placement reveals how you process feelings, what gives you comfort, and your subconscious patterns.`,
    },
    {
      planet: 'Ascendant',
      sign: ascendant.sign,
      house: 1,
      glyph: ascendant.glyph,
      color: PLANET_COLORS['Ascendant'] ?? '#22C55E',
      roleLabel: 'Your outer self',
      description: `The mask you present to the world is colored by ${ascendant.sign}. Your rising sign shapes first impressions, your physical appearance, and how you instinctively approach new situations and people.`,
    },
  ]

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden divide-y divide-white/5"
        style={{ background: 'rgba(15,30,53,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {entries.map((entry) => (
          <button
            key={entry.planet}
            onClick={() => setSelected(entry)}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/4 transition-colors text-left"
          >
            {/* Planet glyph circle */}
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-xl shrink-0"
              style={{
                background: `radial-gradient(circle, ${entry.color}20, ${entry.color}05)`,
                color: entry.color,
                border: `1px solid ${entry.color}30`,
              }}
            >
              {entry.glyph}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-left">
              <p className="font-display text-sm font-semibold text-text-primary">
                {entry.planet} in {entry.sign}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">House {entry.house}</p>
            </div>

            {/* Role label + chevron */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-display text-text-muted hidden xs:block">{entry.roleLabel}</span>
              <ChevronRight size={13} className="text-text-muted" />
            </div>
          </button>
        ))}
      </div>

      {/* Detail sheet */}
      <BottomSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.planet} in ${selected.sign}` : ''}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-3xl shrink-0"
                style={{
                  background: `radial-gradient(circle, ${selected.color}20, ${selected.color}05)`,
                  border: `1px solid ${selected.color}30`,
                }}
              >
                {selected.glyph}
              </div>
              <div>
                <p className="font-display text-base font-bold text-text-primary">{selected.planet} in {selected.sign}</p>
                <p className="text-xs text-text-muted mt-0.5">House {selected.house} · {selected.roleLabel}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">{selected.description}</p>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
