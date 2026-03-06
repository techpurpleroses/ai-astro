'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { format } from 'date-fns'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useMoonPhase } from '@/hooks/use-moon-phase'
import { ZODIAC_GLYPHS, ZODIAC_NAMES } from '@/lib/constants'
import { TopCardsStrip, type TopCardsStripItem } from '@/components/today/shared/top-cards-strip'
import { SectionHeroCard } from '@/components/today/shared/section-hero-card'
import { HorizontalRail } from '@/components/today/shared/horizontal-rail'
import { TabSectionBlock } from '@/components/today/shared/tab-section-block'
import { CosmicMiniCardFrame } from '@/components/today/shared/cosmic-mini-card-frame'
import { TODAY_SECTION_STACK_CLASS } from '@/components/today/shared/layout-tokens'
import type { MoonEvent, MoonPhaseData } from '@/types'

const TOP_MOON_CARDS: TopCardsStripItem[] = [
  { id: 'waning-gibbous', label: 'Waning Gibbous', image: '/assets/today/moon/waning-gibbous.webp' },
  { id: 'moon-in-libra', label: 'Moon In Libra', image: '/assets/today/moon/moon-in-libra.webp' },
  { id: 'moon-rituals', label: 'Moon Rituals', image: '/assets/today/moon/moon-rituals.webp' },
  { id: 'moon-do-dont', label: 'Do / Dont', image: '/assets/today/moon/do-dont.webp' },
]

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

function MoonHeroCard({ phase, events }: { phase: MoonPhaseData; events: MoonEvent[] }) {
  const phaseImage = PHASE_IMAGES[phase.name] ?? '/assets/today/moon/waning-gibbous.webp'
  const signImage = SIGN_IMAGES[phase.sign]
  const timeline = events.slice(0, 4)

  return (
    <div className="px-4">
      <SectionHeroCard
        backgroundImage="/assets/today/moon/moon-card-bg.webp"
        borderColor="rgba(231,196,79,0.3)"
        overlayClassName="from-black/10 via-[#08182b]/10 to-[#08182b]/78"
      >
          <p className="text-[12px] font-display text-slate-200/80">
            {format(new Date(phase.startDate), 'MMM d')} - {format(new Date(phase.endDate), 'MMM d')}
          </p>
          <h3 className="mt-1 text-[30px] font-display font-bold leading-[1.08] text-white">{phase.name}</h3>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-full border border-white/20 bg-midnight-900/80">
              <Image src={phaseImage} alt={phase.name} fill className="object-cover" sizes="104px" />
            </div>

            <div className="flex-1 rounded-xl border border-white/12 bg-black/25 p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg text-[#E7C44F]">{ZODIAC_GLYPHS[phase.sign]}</span>
                <p className="text-sm font-display font-semibold text-white">Moon in {ZODIAC_NAMES[phase.sign]}</p>
              </div>
              <div className="mt-2 flex items-center justify-center">
                {signImage ? (
                  <div className="relative h-[70px] w-[70px]">
                    <Image src={signImage} alt={ZODIAC_NAMES[phase.sign]} fill className="object-contain" sizes="70px" />
                  </div>
                ) : (
                  <span className="text-4xl text-slate-200">{ZODIAC_GLYPHS[phase.sign]}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {timeline.map((event) => {
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
      </SectionHeroCard>
    </div>
  )
}

function MoonEventCard({ event, index }: { event: MoonEvent; index: number }) {
  const signTitle = `Moon in ${ZODIAC_NAMES[event.sign]}`
  const title = index < 2 ? signTitle : event.type
  const image = index < 2 ? SIGN_IMAGES[event.sign] ?? PHASE_IMAGES[event.type] : PHASE_IMAGES[event.type] ?? SIGN_IMAGES[event.sign]

  return (
    <CosmicMiniCardFrame
      dateLabel={format(new Date(event.date), 'MMM d')}
      backgroundImage="/assets/today/moon/moon-card-bg.webp"
      imageOpacityClassName="opacity-90"
    >
      <div className="mt-3 flex justify-center">
        {image ? (
          <div className="relative h-[98px] w-[98px]">
            <Image src={image} alt={title} fill className="object-contain" sizes="98px" />
          </div>
        ) : (
          <span className="text-4xl text-slate-200">{ZODIAC_GLYPHS[event.sign]}</span>
        )}
      </div>

      <h4 className="mt-auto line-clamp-2 text-[18px] font-display font-semibold leading-[1.2] text-white">{title}</h4>
    </CosmicMiniCardFrame>
  )
}

interface MoonSectionProps {
  showTopStrip?: boolean
  showHeroCard?: boolean
}

export function MoonSection({ showTopStrip = true, showHeroCard = true }: MoonSectionProps) {
  const { data, isLoading } = useMoonPhase()

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pb-4">
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-56" />
        <SkeletonCard className="h-52" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className={TODAY_SECTION_STACK_CLASS}>
      {showTopStrip && (
        <FadeIn delay={0}>
          <TopCardsStrip items={TOP_MOON_CARDS} />
        </FadeIn>
      )}

      {showHeroCard && (
        <FadeIn delay={0.05}>
          <MoonHeroCard phase={data.currentPhase} events={data.upcomingEvents} />
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
        <TabSectionBlock title="Upcoming Moon Events">
          <HorizontalRail>
            {data.upcomingEvents.map((event, index) => (
              <MoonEventCard key={`${event.date}-${event.type}`} event={event} index={index} />
            ))}
          </HorizontalRail>
        </TabSectionBlock>
      </FadeIn>
    </div>
  )
}
