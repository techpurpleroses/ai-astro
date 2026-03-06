'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { format } from 'date-fns'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useTransits, useRetrogrades } from '@/hooks/use-transits'
import { PLANET_GLYPHS } from '@/lib/constants'
import { TopCardsStrip, type TopCardsStripItem } from '@/components/today/shared/top-cards-strip'
import { SectionHeroCard } from '@/components/today/shared/section-hero-card'
import { HorizontalRail } from '@/components/today/shared/horizontal-rail'
import { TabSectionBlock } from '@/components/today/shared/tab-section-block'
import { CosmicMiniCardFrame } from '@/components/today/shared/cosmic-mini-card-frame'
import { TODAY_SECTION_STACK_CLASS } from '@/components/today/shared/layout-tokens'
import type { Retrograde, Transit } from '@/types'

const TOP_EVENT_CARDS: TopCardsStripItem[] = [
  { id: 'short-transit', label: 'Your Short-Term Transit', image: '/assets/today/events/short-transit.webp' },
  { id: 'long-transit', label: 'Your Long-Term Transit', image: '/assets/today/events/long-transit.webp' },
  { id: 'active-retrogrades', label: 'Active Retrogrades', image: '/assets/today/events/active-retrogrades.webp' },
  { id: 'what-are-transits', label: 'What Are Transits?', image: '/assets/today/events/what-are-transits.webp' },
]

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

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

function PlanetOrb({
  planet,
  size,
  spinDuration = 20,
}: {
  planet: string
  size: number
  spinDuration?: number
}) {
  const src = PLANET_IMAGES[planet]
  const glyph = PLANET_GLYPHS[planet] ?? planet[0]

  return (
    <div className="relative shrink-0 rounded-full" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, rgba(255,255,255,0.02), rgba(255,255,255,0.26), rgba(255,255,255,0.03), rgba(255,255,255,0.24), rgba(255,255,255,0.02))',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: spinDuration, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-[2px] overflow-hidden rounded-full border border-white/15 bg-midnight-900/70">
        {src ? (
          <Image src={src} alt={planet} fill className="object-cover" sizes={`${size}px`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-slate-200">{glyph}</div>
        )}
      </div>
      <div className="absolute inset-0 rounded-full shadow-[0_0_28px_rgba(6,182,212,0.25)]" />
    </div>
  )
}

function EventOfDayCard({ transit }: { transit: Transit }) {
  const aspectSymbol = ASPECT_SYMBOLS[transit.aspect] ?? '*'
  const isPositive = transit.aspect === 'sextile' || transit.aspect === 'trine'

  return (
    <div className="px-4">
      <SectionHeroCard
        backgroundImage="/assets/today/events/event-card-bg.webp"
        borderColor="rgba(34,211,238,0.26)"
        className="h-[332px]"
        contentClassName="h-full flex flex-col"
      >
          <p className="text-[11px] font-display text-cyan-100/90">Event of the day</p>
          <h3 className="mt-1 max-w-[240px] text-[30px] font-display font-bold leading-[1.08] text-white">
            {transit.transitingPlanet} {aspectSymbol} {transit.natalPlanet}
          </h3>

          <div className="mt-3 flex items-center justify-center gap-4">
            <PlanetOrb planet={transit.transitingPlanet} size={68} spinDuration={16} />
            <span className="text-lg font-semibold text-rose-300">{aspectSymbol}</span>
            <PlanetOrb planet={transit.natalPlanet} size={96} spinDuration={20} />
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
    </div>
  )
}

function RetrogradeCard({ item }: { item: Retrograde }) {
  return (
    <CosmicMiniCardFrame
      dateLabel={format(new Date(item.startDate), 'MMM d')}
      backgroundImage="/assets/today/events/retrograde-card-bg.webp"
      imageOpacityClassName="opacity-95"
      overlayClassName="bg-gradient-to-b from-[#071425]/10 to-[#071425]/70"
    >
      <div className="mt-2 flex justify-center">
        <PlanetOrb planet={item.planet} size={92} spinDuration={12} />
      </div>

      <h4 className="mt-auto line-clamp-2 text-[18px] font-display font-semibold leading-[1.2] text-white">
        {item.planet} Retrograde
      </h4>
    </CosmicMiniCardFrame>
  )
}

function TransitDeckCard({ item }: { item: Transit }) {
  const aspectSymbol = ASPECT_SYMBOLS[item.aspect] ?? '*'
  const isPositive = item.aspect === 'sextile' || item.aspect === 'trine'
  const isNegative = item.aspect === 'opposition' || item.aspect === 'square'

  return (
    <CosmicMiniCardFrame
      dateLabel={format(new Date(item.startDate), 'MMM d')}
      backgroundImage="/assets/today/events/transit-card-bg.webp"
      imageOpacityClassName="opacity-85"
    >
      <div className="mt-2 flex items-center justify-center gap-2">
        <PlanetOrb planet={item.transitingPlanet} size={34} />
        <span className="text-[19px] text-cyan-300">{aspectSymbol}</span>
        <PlanetOrb planet={item.natalPlanet} size={58} />
      </div>

      <h4 className="mt-auto line-clamp-2 text-[18px] font-display font-semibold leading-[1.2] text-white">
        {item.transitingPlanet} {aspectSymbol} {item.natalPlanet}
      </h4>
      <p
        className={`mt-1 text-sm font-display ${
          isPositive ? 'text-lime-400' : isNegative ? 'text-rose-400' : 'text-slate-300'
        }`}
      >
        {isPositive ? 'Positive' : isNegative ? 'Negative' : 'Neutral'}
      </p>
    </CosmicMiniCardFrame>
  )
}

interface AstroEventsSectionProps {
  showTopStrip?: boolean
  showHeroCard?: boolean
}

export function AstroEventsSection({ showTopStrip = true, showHeroCard = true }: AstroEventsSectionProps) {
  const { data: transits, isLoading: loadingTransits } = useTransits()
  const { data: retrogrades, isLoading: loadingRetrogrades } = useRetrogrades()

  if (loadingTransits || loadingRetrogrades) {
    return (
      <div className="space-y-4 px-4 pb-4">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  const eventOfDay = transits?.shortTerm?.[0]
  const transitItems = [...(transits?.shortTerm ?? []), ...(transits?.longTerm ?? [])].slice(0, 6)
  const retrogradeItems = [...(retrogrades?.active ?? []), ...(retrogrades?.upcoming ?? [])]
    .filter((item, idx, arr) => arr.findIndex((x) => x.planet === item.planet) === idx)
    .slice(0, 6)

  return (
    <div className={TODAY_SECTION_STACK_CLASS}>
      {showTopStrip && (
        <FadeIn delay={0}>
          <TopCardsStrip items={TOP_EVENT_CARDS} />
        </FadeIn>
      )}

      {showHeroCard && eventOfDay && (
        <FadeIn delay={0.05}>
          <EventOfDayCard transit={eventOfDay} />
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
        <TabSectionBlock title="Upcoming Retrogrades">
          <HorizontalRail>
            {retrogradeItems.map((item) => (
              <RetrogradeCard key={item.planet} item={item} />
            ))}
          </HorizontalRail>
        </TabSectionBlock>
      </FadeIn>

      <FadeIn delay={0.15}>
        <TabSectionBlock title="Upcoming Transits">
          <HorizontalRail>
            {transitItems.map((item) => (
              <TransitDeckCard key={item.id} item={item} />
            ))}
          </HorizontalRail>
        </TabSectionBlock>
      </FadeIn>
    </div>
  )
}
