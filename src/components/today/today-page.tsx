'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Settings, Gem, Sun, Moon, CircleDot } from 'lucide-react'
import { TodaySectionTabs } from './today-section-tabs'
import { HoroscopeSection } from './horoscope/horoscope-section'
import { AstroEventsSection } from './astro-events/astro-events-section'
import { MoonSection } from './moon/moon-section'
import { TopInsightsStrip } from './horoscope/top-insights-strip'
import { AstroCardStrip } from './astro-events/astro-card-strip'
import { MoonCardStrip } from './moon/moon-card-strip'
import { TabHeroSlider } from './shared/tab-hero-slider'
import { AskAdvisorCard } from './shared/ask-advisor-card'
import { BirthDataPrompt } from '@/components/shared/birth-data-prompt'
import { useUserProfile } from '@/hooks/use-profile'
import { useBirthChart } from '@/hooks/use-birth-chart'
import { ZODIAC_NAMES } from '@/lib/constants'

type TodaySection = 'horoscope' | 'events' | 'moon'
const SECTION_ORDER: TodaySection[] = ['horoscope', 'events', 'moon']

function isValidSection(s: string | null): s is TodaySection {
  return s === 'horoscope' || s === 'events' || s === 'moon'
}

export function TodayClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section')
  const activeSection: TodaySection = isValidSection(sectionParam) ? sectionParam : 'horoscope'
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const sectionIndex = useMemo(() => SECTION_ORDER.indexOf(activeSection), [activeSection])

  const { data: profile } = useUserProfile()
  const { data: chart } = useBirthChart()

  const headerSigns = useMemo(() => {
    const sun = profile?.sunSign
    const moonSign = chart?.bigThree?.moon?.sign
    const rising = chart?.bigThree?.ascendant?.sign
    const signs = [
      sun ? { key: 'sun', label: ZODIAC_NAMES[sun as keyof typeof ZODIAC_NAMES] ?? sun, Icon: Sun } : null,
      moonSign ? { key: 'moon', label: ZODIAC_NAMES[moonSign as keyof typeof ZODIAC_NAMES] ?? moonSign, Icon: Moon } : null,
      rising ? { key: 'rising', label: ZODIAC_NAMES[rising as keyof typeof ZODIAC_NAMES] ?? rising, Icon: CircleDot } : null,
    ].filter((s): s is NonNullable<typeof s> => s !== null)
    return signs.length > 0 ? signs : null
  }, [profile, chart])

  const setSection = useCallback(
    (section: TodaySection) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('section', section)
      router.replace(`/today?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const handleSectionChange = useCallback(
    (section: TodaySection) => {
      const targetIndex = SECTION_ORDER.indexOf(section)
      if (targetIndex === sectionIndex) return
      setSection(section)
    },
    [sectionIndex, setSection],
  )

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('[data-no-nav-swipe="true"]')) {
      touchStartX.current = null
      touchStartY.current = null
      return
    }

    const touch = event.changedTouches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
  }, [])

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (touchStartX.current === null || touchStartY.current === null) return

      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current

      touchStartX.current = null
      touchStartY.current = null

      if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY) * 1.12) return

      const total = SECTION_ORDER.length
      if (deltaX < 0) {
        setSection(SECTION_ORDER[(sectionIndex + 1) % total])
      } else {
        setSection(SECTION_ORDER[(sectionIndex - 1 + total) % total])
      }
    },
    [sectionIndex, setSection],
  )

  return (
    <div className="flex flex-col">
      <div
        className="sticky top-0 z-30 px-4 py-3"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold leading-none text-white">You &gt;</h1>
            {headerSigns && (
              <div className="mt-1 flex items-center gap-2 text-slate-300">
                {headerSigns.map(({ key, label, Icon }, idx) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <Icon size={10} strokeWidth={2.1} className="text-[#C9B08A]" />
                      <span className="font-display text-[12px] font-semibold text-slate-300">{label}</span>
                    </span>
                    {idx < headerSigns.length - 1 ? (
                      <span className="font-display text-[11px] text-slate-500">|</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/settings')}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-midnight-800/60 text-text-muted"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-gold-accent/35 bg-gold-accent/12 text-gold-accent"
            >
              <Gem size={14} />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-400" />
            </button>
          </div>
        </div>
      </div>

      <TodaySectionTabs active={activeSection} onChange={handleSectionChange} />

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {activeSection === 'horoscope' && <TopInsightsStrip />}
        {activeSection === 'events' && <AstroCardStrip />}
        {activeSection === 'moon' && <MoonCardStrip />}

        <BirthDataPrompt />
        <TabHeroSlider active={activeSection} />
        <AskAdvisorCard className="mt-1" />

        <div className="mt-2">
          {activeSection === 'horoscope' && <HoroscopeSection showTopStrip={false} showHeroCard={false} />}
          {activeSection === 'events' && <AstroEventsSection showTopStrip={false} showHeroCard={false} />}
          {activeSection === 'moon' && <MoonSection showTopStrip={false} showHeroCard={false} />}
        </div>
      </div>
    </div>
  )
}
