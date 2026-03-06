'use client'

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Telescope, HelpCircle, Crown, Settings } from 'lucide-react'
import { useBirthChart } from '@/hooks/use-birth-chart'
import { ChartWheelSVG } from './chart-wheel-svg'
import { BigThreeCard } from './big-three-card'
import { StellarCompositionCard } from './stellar-composition'
import { PlanetTable } from './planet-table'
import { TransitCard } from '@/components/today/astro-events/transit-card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { BottomSheet } from '@/components/ui/bottom-sheet'

type BirthChartView = 'chart' | 'transits'

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

function ViewTabs({ active, onChange }: { active: BirthChartView; onChange: (v: BirthChartView) => void }) {
  const tabs: { id: BirthChartView; label: string }[] = [
    { id: 'transits', label: 'Daily Transits' },
    { id: 'chart', label: 'Your Chart' },
  ]
  return (
    <div className="flex gap-2 px-4 pb-3">
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            className="relative flex-1 py-2 rounded-full text-xs font-display font-semibold transition-colors"
            style={{
              color: isActive ? '#F59E0B' : '#4E6179',
              background: isActive ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
              border: isActive ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function ChartView() {
  const [learnOpen, setLearnOpen] = useState(false)
  const [planetOpen, setPlanetOpen] = useState<string | null>(null)
  const { data, isLoading } = useBirthChart()
  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pb-4">
        <SkeletonCard className="h-80 rounded-3xl" />
        <SkeletonCard className="h-36" />
        <SkeletonCard className="h-48" />
      </div>
    )
  }
  if (!data) return null
  return (
    <div className="space-y-5 pb-4">
      <FadeIn delay={0}>
        <div className="flex flex-col items-center px-4">
          <div className="rounded-3xl overflow-hidden p-3"
            style={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(6,182,212,0.15)', boxShadow: '0 0 40px rgba(6,182,212,0.08)' }}
          >
            <ChartWheelSVG
              planets={data.planets}
              houses={data.houses}
              aspects={data.aspects}
              size={310}
              onPlanetClick={(planet) => setPlanetOpen(planet.name)}
            />
          </div>
          <p className="text-xs leading-relaxed text-text-secondary text-center mt-3 px-2">
            This is your unique birth chart, based on your birth date, time, and place of birth.
          </p>
          <button
            onClick={() => setLearnOpen(true)}
            className="mt-2 flex items-center gap-1.5 text-[11px] text-cyan-glow font-display font-medium"
          >
            <HelpCircle size={12} className="text-cyan-glow" />
            What can you learn from reading your birth chart?
          </button>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="px-4">
          <PlanetTable planets={data.planets} />
        </div>
      </FadeIn>

      <FadeIn delay={0.12}>
        <div className="px-4 space-y-3">
          <div>
            <h2 className="font-display text-sm font-bold text-text-primary">Your Core Personality</h2>
            <p className="text-[10px] text-text-muted mt-0.5 leading-snug">
              The big 3 of your birth chart encompasses your self expression, emotions and motivation
            </p>
          </div>
          <BigThreeCard sun={data.bigThree.sun} moon={data.bigThree.moon} ascendant={data.bigThree.ascendant} />
        </div>
      </FadeIn>

      <FadeIn delay={0.18}>
        <div className="px-4 space-y-3">
          <div>
            <h2 className="font-display text-sm font-bold text-text-primary">Your Stellar Composition</h2>
            <p className="text-[10px] text-text-muted mt-0.5 leading-snug">
              Personal and social planets make a unique layer to your multifaceted being
            </p>
          </div>
          <StellarCompositionCard planets={data.planets} />
        </div>
      </FadeIn>

      <BottomSheet open={learnOpen} onClose={() => setLearnOpen(false)} title="Birth Chart Basics">
        <div className="space-y-3">
          <p className="text-sm text-text-secondary leading-relaxed">
            Your birth chart is a snapshot of the sky at your exact birth time. It helps decode personality patterns, strengths, challenges, and growth direction.
          </p>
          <ul className="space-y-1.5 text-xs text-text-secondary">
            <li>* Planets show your core drives.</li>
            <li>* Signs show how those drives express.</li>
            <li>* Houses show where they play out in life.</li>
          </ul>
        </div>
      </BottomSheet>

      {planetOpen && (
        <BottomSheet open={!!planetOpen} onClose={() => setPlanetOpen(null)} title={`${planetOpen} Details`}>
          <p className="text-sm text-text-secondary leading-relaxed">
            This section gives a compact interpretation for {planetOpen} in your chart. Use this as a quick reference while you explore your planets table below.
          </p>
        </BottomSheet>
      )}
    </div>
  )
}

function TransitsView() {
  const [transitInfoOpen, setTransitInfoOpen] = useState(false)
  const { data, isLoading } = useBirthChart()
  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pb-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    )
  }
  if (!data) return null
  const { shortTerm, longTerm } = data.dailyTransits
  const today = new Date()
  const dateStrip = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (4 - i))
    return d
  })
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-5 pb-4">
      <FadeIn delay={0}>
        <div className="px-4">
          <div className="flex gap-1.5">
            {dateStrip.map((date, i) => {
              const isToday = i === 4
              return (
                <div key={i} className="flex-1 flex flex-col items-center py-2 rounded-xl text-center"
                  style={{
                    background: isToday ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                    border: isToday ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span className="text-[9px] font-display font-semibold" style={{ color: isToday ? '#06B6D4' : '#4E6179' }}>
                    {DAY_NAMES[date.getDay()]}
                  </span>
                  <span className="text-[11px] font-display font-bold mt-0.5" style={{ color: isToday ? '#06B6D4' : '#94A3B8' }}>
                    {date.getDate()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        <button
          onClick={() => setTransitInfoOpen(true)}
          className="mx-4 w-[calc(100%-2rem)] flex items-center justify-between px-4 py-3 rounded-xl text-left"
          style={{ background: 'rgba(15,30,53,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-xs text-text-secondary">Why should you care about transits and aspects?</span>
          <span className="text-text-muted text-lg leading-none">&#8250;</span>
        </button>
      </FadeIn>

      {shortTerm.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="px-4">
            <h2 className="font-display text-sm font-bold text-text-primary mb-3">Your Short-Term Transits</h2>
            <div className="space-y-2">
              {shortTerm.map((t) => <TransitCard key={t.id} transit={t} />)}
            </div>
          </div>
        </FadeIn>
      )}

      {longTerm.length > 0 && (
        <FadeIn delay={0.16}>
          <div className="px-4">
            <h2 className="font-display text-sm font-bold text-text-primary mb-3">Your Long-Term Transits</h2>
            <div className="space-y-2">
              {longTerm.map((t) => <TransitCard key={t.id} transit={t} />)}
            </div>
          </div>
        </FadeIn>
      )}

      <BottomSheet open={transitInfoOpen} onClose={() => setTransitInfoOpen(false)} title="Transits and Aspects">
        <div className="space-y-3">
          <p className="text-sm text-text-secondary leading-relaxed">
            Transits describe how current planet movement interacts with your natal chart. They show timing windows for action, review, and emotional shifts.
          </p>
          <p className="text-xs text-text-secondary">
            Short-term transits are fast and tactical. Long-term transits are structural and define larger chapters.
          </p>
        </div>
      </BottomSheet>
    </div>
  )
}

export function BirthChartClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const activeView: BirthChartView = viewParam === 'chart' ? 'chart' : 'transits'

  const handleViewChange = useCallback(
    (view: BirthChartView) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', view)
      router.replace('/birth-chart?' + params.toString(), { scroll: false })
    },
    [router, searchParams],
  )

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="h-8 w-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}
        >
          <Telescope size={15} className="text-violet-400" />
        </div>
        <div className="flex-1">
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">NATAL CHART</p>
          <h1 className="font-display text-base font-bold text-text-primary leading-tight">Birth Chart</h1>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6 border border-white/10"
        >
          <Settings size={14} className="text-text-secondary" />
        </button>
        <div className="flex items-center gap-1 bg-gold-accent/10 border border-gold-accent/25 px-2.5 py-1 rounded-full">
          <Crown size={10} className="text-gold-accent" />
          <span className="text-[9px] font-display font-bold text-gold-accent">PRO</span>
        </div>
      </div>

      <div className="pt-3">
        <ViewTabs active={activeView} onChange={handleViewChange} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeView}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {activeView === 'chart' && <ChartView />}
          {activeView === 'transits' && <TransitsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
