'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { PLANET_COLORS } from '@/lib/constants'
import type { PlanetPosition } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  Mercury: 'Your intellectual side',
  Venus: 'Your approach to love',
  Mars: 'Your approach to life',
  Jupiter: 'Your strengths',
  Saturn: 'Your discipline',
  Uranus: 'Your uniqueness',
  Neptune: 'Your spirituality',
  Pluto: 'Your transformation',
}

interface StellarCompositionProps {
  planets: PlanetPosition[]
}

export function StellarCompositionCard({ planets }: StellarCompositionProps) {
  const [selected, setSelected] = useState<PlanetPosition | null>(null)

  // Personal & social planets (Mercury → Saturn)
  const personalPlanets = planets.filter((p) =>
    ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.name)
  )

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden divide-y divide-white/5"
        style={{ background: 'rgba(15,30,53,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {personalPlanets.map((planet) => {
          const color = PLANET_COLORS[planet.name] ?? '#94A3B8'
          const roleLabel = ROLE_LABELS[planet.name] ?? 'Your cosmic influence'
          return (
            <button
              key={planet.name}
              onClick={() => setSelected(planet)}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/4 transition-colors text-left"
            >
              {/* Planet glyph circle */}
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-xl shrink-0"
                style={{
                  background: `radial-gradient(circle, ${color}20, ${color}05)`,
                  color,
                  border: `1px solid ${color}30`,
                }}
              >
                {planet.glyph}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <p className="font-display text-sm font-semibold text-text-primary">
                  {planet.name} in {planet.sign}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">House {planet.house}</p>
              </div>

              {/* Role label + chevron */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-display text-text-muted">{roleLabel}</span>
                <ChevronRight size={13} className="text-text-muted" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Detail sheet */}
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
                  House {selected.house} · {ROLE_LABELS[selected.name] ?? 'Cosmic influence'}
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
