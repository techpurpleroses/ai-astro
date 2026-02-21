'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { MoonCard } from './moon-card'
import { MoonInSignCard } from './moon-in-sign-card'
import { UpcomingMoonEvents } from './upcoming-moon-events'
import { useMoonPhase } from '@/hooks/use-moon-phase'
import { SkeletonCard } from '@/components/ui/skeleton'

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.42, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

export function MoonSection() {
  const { data, isLoading } = useMoonPhase()

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pb-4">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-48" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4 pb-4">
      <FadeIn delay={0}>
        <MoonCard phase={data.currentPhase} />
      </FadeIn>

      <FadeIn delay={0.08}>
        <MoonInSignCard phase={data.currentPhase} />
      </FadeIn>

      <FadeIn delay={0.16}>
        <UpcomingMoonEvents events={data.upcomingEvents} />
      </FadeIn>
    </div>
  )
}
