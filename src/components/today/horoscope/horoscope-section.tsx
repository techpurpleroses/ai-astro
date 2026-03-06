'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { YourHoroscopeCard } from './your-horoscope-card'
import { AlternativeHoroscope } from './alternative-horoscope'
import { DailyReadingsGrid } from './daily-readings-grid'
import { TrendingsCard } from './trendings-card'
import { TopInsightsStrip } from './top-insights-strip'
import { ReportsFromAdvisors } from '@/components/reports/reports-from-advisors'
import { useDailyReadings } from '@/hooks/use-horoscope'
import { SkeletonCard } from '@/components/ui/skeleton'
import { TabSectionBlock } from '@/components/today/shared/tab-section-block'

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

interface HoroscopeSectionProps {
  showTopStrip?: boolean
  showHeroCard?: boolean
}

export function HoroscopeSection({ showTopStrip = true, showHeroCard = true }: HoroscopeSectionProps) {
  const router = useRouter()
  const { data: readings, isLoading } = useDailyReadings()

  return (
    <div className="space-y-6 pb-5">
      {showTopStrip && (
        <FadeInSection delay={0}>
          <TopInsightsStrip />
        </FadeInSection>
      )}

      {showHeroCard && (
        <FadeInSection delay={0.04}>
          <YourHoroscopeCard />
        </FadeInSection>
      )}

      <FadeInSection delay={0.08}>
        <TabSectionBlock title="Reports from advisors" titleClassName="text-text-muted tracking-widest" contentClassName="mt-2">
          <ReportsFromAdvisors compact onOpenReport={(id) => router.push(`/settings/reports/${id}`)} />
        </TabSectionBlock>
      </FadeInSection>

      <FadeInSection delay={0.12}>
        {isLoading ? (
          <div className="px-4 space-y-3">
            <div className="h-5 w-32 skeleton rounded-md" />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        ) : readings ? (
          <DailyReadingsGrid readings={readings} />
        ) : null}
      </FadeInSection>

      <FadeInSection delay={0.16}>
        {readings && (
          <TrendingsCard question={readings.trendingQuestion} />
        )}
      </FadeInSection>

      <FadeInSection delay={0.2}>
        <AlternativeHoroscope />
      </FadeInSection>
    </div>
  )
}
