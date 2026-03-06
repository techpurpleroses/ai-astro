'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { SectionHeroCard } from './section-hero-card'
import { useHoroscope } from '@/hooks/use-horoscope'
import { useTransits } from '@/hooks/use-transits'
import { useMoonPhase } from '@/hooks/use-moon-phase'
import { DEFAULT_SIGN, ZODIAC_GLYPHS, ZODIAC_NAMES } from '@/lib/constants'
import type { MoonEvent, MoonPhaseData, Transit } from '@/types'

type TodaySection = 'horoscope' | 'events' | 'moon'

const ORDER: TodaySection[] = ['horoscope', 'events', 'moon']
const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '\u260C',
  opposition: '\u260D',
  trine: '\u25B3',
  square: '\u25A1',
  sextile: '\u2736',
  quincunx: '\u26BB',
}

const PLANET_IMAGES: Record<string, string> = {
  Moon: '/assets/today/events/planets/moon.png',
  Sun: '/assets/today/events/planets/sun.png',
  Mercury: '/assets/today/events/planets/mercury.png',
  Venus: '/assets/today/events/planets/venus.png',
  Mars: '/assets/today/events/planets/mars.png',
  Jupiter: '/assets/today/events/planets/jupiter.png',
  Saturn: '/assets/today/events/planets/saturn.png',
  Uranus: '/assets/today/events/planets/uranus.png',
  Neptune: '/assets/today/events/planets/neptune.png',
  Pluto: '/assets/today/events/planets/pluto.png',
}

const PHASE_IMAGES: Record<string, string> = {
  'New Moon': '/assets/today/moon/phases/new-moon.webp',
  'Waxing Crescent': '/assets/today/moon/phases/waxing-crescent.webp',
  'First Quarter': '/assets/today/moon/phases/first-quarter.webp',
  'Waxing Gibbous': '/assets/today/moon/phases/waxing-gibbous.webp',
  'Full Moon': '/assets/today/moon/phases/full-moon.webp',
  'Waning Gibbous': '/assets/today/moon/waning-gibbous.webp',
  'Last Quarter': '/assets/today/moon/phases/last-quarter.webp',
  'Waning Crescent': '/assets/today/moon/phases/waning-crescent.webp',
}

const SIGN_IMAGES: Partial<Record<keyof typeof ZODIAC_NAMES, string>> = {
  libra: '/assets/today/moon/signs/libra.webp',
  scorpio: '/assets/today/moon/signs/scorpio.webp',
  sagittarius: '/assets/today/moon/signs/sagittarius.webp',
  taurus: '/assets/today/moon/signs/taurus.webp',
}

function PlanetOrb({ planet, size }: { planet: string; size: number }) {
  const src = PLANET_IMAGES[planet]
  return (
    <div className="relative shrink-0 rounded-full" style={{ width: size, height: size }}>
      <div className="absolute inset-[2px] overflow-hidden rounded-full border border-white/20 bg-midnight-900/70">
        {src ? (
          <Image src={src} alt={planet} fill className="object-cover" sizes={`${size}px`} />
        ) : (
          <span className="inline-flex h-full w-full items-center justify-center text-2xl text-slate-200">
            {planet[0]}
          </span>
        )}
      </div>
      <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.22)]" />
    </div>
  )
}

function HoroscopeHero() {
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const { data: reading } = useHoroscope(dateStr)

  return (
    <SectionHeroCard
      backgroundImage="/assets/today/horoscope/horoscope-card-bg.png"
      borderColor="rgba(132,204,22,0.3)"
      className="h-[332px]"
      overlayClassName="from-[#031b32]/86 via-[#031b32]/56 to-[#031b32]/90"
      contentClassName="h-full flex flex-col pb-4"
      backgroundAlt="Horoscope"
    >
      <p className="mb-1 text-[11px] text-slate-300">{ZODIAC_NAMES[DEFAULT_SIGN]}</p>
      <h3 className="mb-2 font-display text-[30px] font-bold leading-[1.05] text-white">Your Horoscope</h3>

      <div
        className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
        style={{ background: 'rgba(107,114,128,0.5)', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        <div className="flex -space-x-1">
          <span className="h-3 w-3 rounded-full border border-white/20 bg-cyan-300/80" />
          <span className="h-3 w-3 rounded-full border border-white/20 bg-amber-300/80" />
          <span className="h-3 w-3 rounded-full border border-white/20 bg-slate-200/80" />
        </div>
        <span className="text-[10px] font-display font-semibold text-white">Transits influencing: 4</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[14px] font-display font-bold text-lime-300">Focus</p>
          {(reading?.opportunities ?? ['Dedication', 'Discipline', 'Ambition']).slice(0, 3).map((item) => (
            <p key={item} className="mb-0.5 text-[12px] leading-snug text-lime-100">
              {item}
            </p>
          ))}
        </div>
        <div>
          <p className="mb-1 text-[14px] font-display font-bold text-rose-300">Troubles</p>
          {(reading?.challenges ?? ['Stress', 'Communication', 'Imbalance']).slice(0, 3).map((item) => (
            <p key={item} className="mb-0.5 text-[12px] leading-snug text-rose-100">
              {item}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-3">
        <button
          className="h-9 w-full rounded-full text-xs font-display font-semibold text-lime-50"
          style={{ background: 'linear-gradient(135deg, #84CC16, #65A30D)' }}
        >
          Read more
        </button>
      </div>
    </SectionHeroCard>
  )
}

function EventsHero() {
  const { data: transits } = useTransits()
  const transit: Transit | undefined = transits?.shortTerm?.[0] ?? transits?.longTerm?.[0]
  const aspectSymbol = transit ? ASPECT_SYMBOLS[transit.aspect] ?? '\u2736' : '\u2736'
  const isPositive = transit?.aspect === 'sextile' || transit?.aspect === 'trine'

  return (
    <SectionHeroCard
      backgroundImage="/assets/today/events/event-card-bg.webp"
      borderColor="rgba(34,211,238,0.26)"
      className="h-[332px]"
      contentClassName="h-full flex flex-col"
    >
      <p className="text-[11px] font-display text-cyan-100/90">Event of the day</p>
      <h3 className="mt-1 max-w-[240px] text-[30px] font-display font-bold leading-[1.08] text-white">
        {transit ? `${transit.transitingPlanet} ${aspectSymbol} ${transit.natalPlanet}` : 'Moon \u2736 Sextile Your Saturn'}
      </h3>

      <div className="mt-3 flex items-center justify-center gap-4">
        <PlanetOrb planet={transit?.transitingPlanet ?? 'Moon'} size={68} />
        <span className="text-lg font-semibold text-cyan-300">{aspectSymbol}</span>
        <PlanetOrb planet={transit?.natalPlanet ?? 'Saturn'} size={96} />
      </div>

      <div className="mt-auto pt-3">
        <p className={`text-sm font-display ${isPositive ? 'text-lime-400' : 'text-rose-400'}`}>
          {isPositive ? 'Positive Influence' : 'Negative Influence'}
        </p>
        <button
          className="mt-2 h-9 w-full rounded-full text-xs font-display font-semibold text-cyan-50"
          style={{ background: 'linear-gradient(135deg, #2DD4BF, #22D3EE)' }}
        >
          Read more
        </button>
      </div>
    </SectionHeroCard>
  )
}

function MoonHero() {
  const { data } = useMoonPhase()
  const phase: MoonPhaseData | undefined = data?.currentPhase
  const events: MoonEvent[] = data?.upcomingEvents ?? []
  const timeline = events.slice(0, 4)
  const phaseImage = phase ? PHASE_IMAGES[phase.name] : '/assets/today/moon/waning-gibbous.webp'
  const signImage = phase ? SIGN_IMAGES[phase.sign] : undefined

  return (
    <SectionHeroCard
      backgroundImage="/assets/today/moon/moon-card-bg.webp"
      borderColor="rgba(231,196,79,0.3)"
      className="h-[332px]"
      contentClassName="h-full flex flex-col"
      overlayClassName="from-black/10 via-[#08182b]/10 to-[#08182b]/78"
    >
      <p className="text-[12px] font-display text-slate-200/80">
        {phase
          ? `${format(new Date(phase.startDate), 'MMM d')} - ${format(new Date(phase.endDate), 'MMM d')}`
          : 'Mar 4 - Mar 11'}
      </p>
      <h3 className="mt-1 text-[30px] font-display font-bold leading-[1.08] text-white">{phase?.name ?? 'Waning Gibbous'}</h3>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-full border border-white/20 bg-midnight-900/80">
          <Image src={phaseImage} alt={phase?.name ?? 'Moon'} fill className="object-cover" sizes="104px" />
        </div>
        <div className="flex-1 rounded-xl border border-white/12 bg-black/25 p-2.5">
          <div className="flex items-center gap-2">
            <span className="text-lg text-[#E7C44F]">{phase ? ZODIAC_GLYPHS[phase.sign] : '\u264e'}</span>
            <p className="text-sm font-display font-semibold text-white">
              Moon in {phase ? ZODIAC_NAMES[phase.sign] : 'Libra'}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-center">
            {signImage ? (
              <div className="relative h-[70px] w-[70px]">
                <Image src={signImage} alt="Moon sign" fill className="object-contain" sizes="70px" />
              </div>
            ) : (
              <span className="text-4xl text-slate-200">\u264e</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-3">
        <div className="grid grid-cols-4 gap-2">
          {(timeline.length ? timeline : [{ date: '2026-03-03', type: 'First Quarter' } as MoonEvent]).map((event) => {
            const icon = PHASE_IMAGES[event.type]
            return (
              <div key={`${event.date}-${event.type}`} className="text-center">
                <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-midnight-900/80">
                  {icon ? (
                    <Image src={icon} alt={event.type} width={28} height={28} className="h-full w-full object-cover" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300/80" />
                  )}
                </div>
                <p className="text-[10px] font-display text-slate-300">{format(new Date(event.date), 'MMM d')}</p>
              </div>
            )
          })}
        </div>

        <button
          className="mt-3 h-10 w-full rounded-full text-sm font-display font-semibold text-[#FFF8E0]"
          style={{ background: 'linear-gradient(135deg, #C8A641, #AF8B2C)' }}
        >
          Read more
        </button>
      </div>
    </SectionHeroCard>
  )
}

interface TabHeroSliderProps {
  active: TodaySection
}

export function TabHeroSlider({ active }: TabHeroSliderProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const activeIndex = ORDER.indexOf(active)
  const sidePeek = 16
  const slideGap = 10

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return

    const sync = () => setViewportWidth(node.clientWidth)
    sync()

    const observer = new ResizeObserver(sync)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const cardWidth = Math.max(0, (viewportWidth || 320) - sidePeek * 2)
  const trackStyle = useMemo(
    () => ({
      gap: `${slideGap}px`,
      paddingLeft: `${sidePeek}px`,
      paddingRight: `${sidePeek}px`,
      transform: `translate3d(-${activeIndex * (cardWidth + slideGap)}px, 0, 0)`,
      transition: 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
      willChange: 'transform',
    }),
    [activeIndex, cardWidth, sidePeek, slideGap],
  )

  return (
    <div className="mt-3 px-4 pb-2">
      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex" style={trackStyle}>
          <div className="shrink-0" style={{ width: `${cardWidth}px` }}>
            <HoroscopeHero />
          </div>
          <div className="shrink-0" style={{ width: `${cardWidth}px` }}>
            <EventsHero />
          </div>
          <div className="shrink-0" style={{ width: `${cardWidth}px` }}>
            <MoonHero />
          </div>
        </div>
      </div>
    </div>
  )
}
