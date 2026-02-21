'use client'

import {
  CX, CY,
  R_OUTER, R_SIGN_OUTER, R_SIGN_INNER, R_PLANET, R_ASPECT,
  signArcPath, signMidXY, degToXY, houseLine, aspectLine, spreadPlanetPositions,
} from '@/lib/natal-chart-math'
import { PLANET_COLORS, ASPECT_COLORS } from '@/lib/constants'
import type { PlanetPosition, HousePosition, Aspect } from '@/types'

// ── Zodiac sign data ──────────────────────────────────────────────────────────

const SIGNS = [
  { name: 'Aries',       glyph: '♈', color: '#EF4444', startDeg: 0   },
  { name: 'Taurus',      glyph: '♉', color: '#84CC16', startDeg: 30  },
  { name: 'Gemini',      glyph: '♊', color: '#F59E0B', startDeg: 60  },
  { name: 'Cancer',      glyph: '♋', color: '#06B6D4', startDeg: 90  },
  { name: 'Leo',         glyph: '♌', color: '#EF4444', startDeg: 120 },
  { name: 'Virgo',       glyph: '♍', color: '#84CC16', startDeg: 150 },
  { name: 'Libra',       glyph: '♎', color: '#F59E0B', startDeg: 180 },
  { name: 'Scorpio',     glyph: '♏', color: '#06B6D4', startDeg: 210 },
  { name: 'Sagittarius', glyph: '♐', color: '#EF4444', startDeg: 240 },
  { name: 'Capricorn',   glyph: '♑', color: '#84CC16', startDeg: 270 },
  { name: 'Aquarius',    glyph: '♒', color: '#F59E0B', startDeg: 300 },
  { name: 'Pisces',      glyph: '♓', color: '#06B6D4', startDeg: 330 },
]

interface ChartWheelSVGProps {
  planets: PlanetPosition[]
  houses: HousePosition[]
  aspects: Aspect[]
  size?: number
  onPlanetClick?: (planet: PlanetPosition) => void
}

export function ChartWheelSVG({
  planets,
  houses,
  aspects,
  size = 340,
  onPlanetClick,
}: ChartWheelSVGProps) {
  // Spread planets to avoid label collision
  const spread = spreadPlanetPositions(
    planets.map((p) => ({ name: p.name, absoluteDegree: p.absoluteDegree })),
  )
  const displayDegMap = new Map(spread.map((p) => [p.name, p.displayDegree]))

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      style={{ display: 'block' }}
      aria-label="Natal birth chart wheel"
    >
      <defs>
        {/* Background gradient */}
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#162540" />
          <stop offset="100%" stopColor="#0A1628" />
        </radialGradient>

        {/* Aspect region mask (inner circle) */}
        <clipPath id="innerClip">
          <circle cx={CX} cy={CY} r={R_ASPECT} />
        </clipPath>

        {/* Glow filters per planet color */}
        <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Background ─────────────────────────────────── */}
      <circle cx={CX} cy={CY} r={R_OUTER} fill="url(#bgGrad)" />

      {/* ── Zodiac sign arcs ────────────────────────────── */}
      {SIGNS.map((sign) => (
        <g key={sign.name}>
          <path
            d={signArcPath(sign.startDeg)}
            fill={`${sign.color}14`}
            stroke={`${sign.color}40`}
            strokeWidth={0.5}
          />
          {/* Sign glyph */}
          {(() => {
            const mid = signMidXY(sign.startDeg, (R_SIGN_OUTER + R_SIGN_INNER) / 2)
            return (
              <text
                x={mid.x}
                y={mid.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fill={sign.color}
                opacity={0.85}
                style={{ userSelect: 'none' }}
              >
                {sign.glyph}
              </text>
            )
          })()}
        </g>
      ))}

      {/* ── Outer border circle ─────────────────────────── */}
      <circle
        cx={CX} cy={CY} r={R_SIGN_OUTER}
        fill="none"
        stroke="rgba(6,182,212,0.25)"
        strokeWidth={0.8}
      />

      {/* ── Sign band inner circle ──────────────────────── */}
      <circle
        cx={CX} cy={CY} r={R_SIGN_INNER}
        fill="rgba(10,22,40,0.7)"
        stroke="rgba(6,182,212,0.15)"
        strokeWidth={0.5}
      />

      {/* ── House cusp lines ────────────────────────────── */}
      {houses.map((house) => {
        const line = houseLine(house.absoluteDegree)
        const isAngle = [1, 4, 7, 10].includes(house.number)
        return (
          <line
            key={house.number}
            x1={line.x1} y1={line.y1}
            x2={line.x2} y2={line.y2}
            stroke={isAngle ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.12)'}
            strokeWidth={isAngle ? 1.2 : 0.6}
            strokeDasharray={isAngle ? undefined : '3 3'}
          />
        )
      })}

      {/* House numbers */}
      {houses.map((house) => {
        // Position house number between two cusps
        const nextHouse = houses[(house.number % 12)]
        const midDeg = (house.absoluteDegree + nextHouse.absoluteDegree) / 2
        const pos = degToXY(midDeg, (R_SIGN_INNER + R_ASPECT) / 2)
        return (
          <text
            key={`h${house.number}`}
            x={pos.x} y={pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={7}
            fill="rgba(148,163,184,0.5)"
            style={{ userSelect: 'none' }}
          >
            {house.number}
          </text>
        )
      })}

      {/* ── Inner aspect region circle ──────────────────── */}
      <circle
        cx={CX} cy={CY} r={R_ASPECT}
        fill="rgba(6,10,20,0.8)"
        stroke="rgba(6,182,212,0.1)"
        strokeWidth={0.5}
      />

      {/* ── Aspect lines ────────────────────────────────── */}
      {aspects.map((asp, i) => {
        const line = aspectLine(asp.degree1, asp.degree2)
        const color = ASPECT_COLORS[asp.type] ?? '#94A3B8'
        return (
          <line
            key={i}
            x1={line.x1} y1={line.y1}
            x2={line.x2} y2={line.y2}
            stroke={color}
            strokeWidth={0.8}
            opacity={0.55}
            strokeLinecap="round"
          />
        )
      })}

      {/* ── Center dot ──────────────────────────────────── */}
      <circle cx={CX} cy={CY} r={6} fill="rgba(6,182,212,0.3)" stroke="rgba(6,182,212,0.6)" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={2} fill="#06B6D4" />

      {/* ── Planet glyphs ───────────────────────────────── */}
      {planets.map((planet) => {
        const displayDeg = displayDegMap.get(planet.name) ?? planet.absoluteDegree
        const pos = degToXY(displayDeg, R_PLANET)
        const color = PLANET_COLORS[planet.name] ?? '#94A3B8'

        return (
          <g
            key={planet.name}
            transform={`translate(${pos.x}, ${pos.y})`}
            onClick={() => onPlanetClick?.(planet)}
            style={{ cursor: onPlanetClick ? 'pointer' : 'default' }}
          >
            {/* Planet halo circle */}
            <circle r={10} fill={`${color}18`} stroke={`${color}50`} strokeWidth={0.8} />

            {/* Planet glyph */}
            <text
              x={0} y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={planet.glyph.length > 1 ? 6 : 9}
              fontWeight="600"
              fill={color}
              style={{ userSelect: 'none' }}
            >
              {planet.glyph}
            </text>

            {/* Retrograde indicator */}
            {planet.isRetrograde && (
              <text
                x={8} y={-7}
                textAnchor="middle"
                fontSize={5}
                fill={color}
                opacity={0.8}
                style={{ userSelect: 'none' }}
              >
                ℞
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
