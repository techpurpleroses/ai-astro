'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { PLANET_COLORS } from '@/lib/constants'
import type { PlanetPosition } from '@/types'

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
}

interface PlanetTableProps {
  planets: PlanetPosition[]
}

export function PlanetTable({ planets }: PlanetTableProps) {
  const [selected, setSelected] = useState<PlanetPosition | null>(null)

  return (
    <>
      {/* 3-column Sign | Planet | House table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(6,182,212,0.15)' }}
      >
        {/* Header row */}
        <div
          className="grid grid-cols-3"
          style={{ background: 'rgba(6,182,212,0.15)' }}
        >
          {(['Sign', 'Planet', 'House'] as const).map((h, i) => (
            <div
              key={h}
              className="py-2.5 text-center text-[10px] font-display font-bold text-cyan-glow uppercase tracking-widest"
              style={i === 1 ? { borderLeft: '1px solid rgba(6,182,212,0.15)', borderRight: '1px solid rgba(6,182,212,0.15)' } : undefined}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {planets.map((planet, i) => {
          const color = PLANET_COLORS[planet.name] ?? '#94A3B8'
          const zodiacGlyph = ZODIAC_GLYPHS[planet.sign] ?? '✦'
          return (
            <button
              key={planet.name}
              onClick={() => setSelected(planet)}
              className="w-full grid grid-cols-3 active:bg-white/5 transition-colors"
              style={{
                background: i % 2 === 0 ? 'rgba(15,30,53,0.65)' : 'rgba(10,22,40,0.65)',
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {/* Sign */}
              <div className="py-3 px-2 flex flex-col items-center gap-0.5">
                <span className="text-lg leading-none">{zodiacGlyph}</span>
                <span className="text-[9px] font-display text-text-secondary mt-0.5">{planet.sign}</span>
              </div>
              {/* Planet */}
              <div
                className="py-3 px-2 flex flex-col items-center gap-0.5"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="text-lg leading-none" style={{ color }}>{planet.glyph}</span>
                <span className="text-[9px] font-display text-text-secondary mt-0.5">
                  {planet.name}{planet.isRetrograde && <span className="text-rose-accent"> ℞</span>}
                </span>
              </div>
              {/* House */}
              <div className="py-3 px-2 flex flex-col items-center gap-0.5">
                <span className="font-display text-sm font-bold text-text-primary">{planet.house}</span>
                <span className="text-[9px] font-display text-text-muted mt-0.5">House</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Planet detail sheet */}
      <BottomSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name} in ${selected.sign}` : ''}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-3xl shrink-0"
                style={{
                  background: `radial-gradient(circle, ${PLANET_COLORS[selected.name] ?? '#94A3B8'}20, ${PLANET_COLORS[selected.name] ?? '#94A3B8'}05)`,
                  border: `1px solid ${PLANET_COLORS[selected.name] ?? '#94A3B8'}30`,
                }}
              >
                {selected.glyph}
              </div>
              <div>
                <p className="font-display text-base font-bold text-text-primary">{selected.name} in {selected.sign}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {selected.degree}° · House {selected.house}
                  {selected.isRetrograde && <span className="text-rose-accent ml-1">· Retrograde ℞</span>}
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">{selected.description}</p>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
