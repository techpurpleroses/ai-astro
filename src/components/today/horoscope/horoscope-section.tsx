'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { YourHoroscopeCard } from './your-horoscope-card'
import { AlternativeHoroscope } from './alternative-horoscope'
import { DailyReadingsGrid } from './daily-readings-grid'
import { TrendingsCard } from './trendings-card'
import { useDailyReadings } from '@/hooks/use-horoscope'
import { SkeletonCard } from '@/components/ui/skeleton'

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

export function HoroscopeSection() {
  const { data: readings, isLoading } = useDailyReadings()

  return (
    <div className="space-y-4 pb-4">
      <FadeInSection delay={0}>
        <YourHoroscopeCard />
      </FadeInSection>

      <FadeInSection delay={0.06}>
        <AlternativeHoroscope />
      </FadeInSection>

      <FadeInSection delay={0.12}>
        {isLoading ? (
          <div className="px-4 space-y-3">
            <div className="h-5 w-32 skeleton rounded-md" />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        ) : readings ? (
          <DailyReadingsGrid readings={readings} />
        ) : null}
      </FadeInSection>

      <FadeInSection delay={0.18}>
        {readings && (
          <TrendingsCard question={readings.trendingQuestion} />
        )}
      </FadeInSection>
    </div>
  )
}
