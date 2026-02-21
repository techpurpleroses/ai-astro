'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { format } from 'date-fns'
import { Info, Zap } from 'lucide-react'
import { GlassCard } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/section-header'
import { Badge } from '@/components/ui/badge'
import { TransitCard } from './transit-card'
import { RetrogradePlanetCard } from './retrograde-planet-card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useTransits, useRetrogrades } from '@/hooks/use-transits'
import { PLANET_COLORS, PLANET_GLYPHS } from '@/lib/constants'

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

export function AstroEventsSection() {
  const { data: transits, isLoading: loadingTransits } = useTransits()
  const { data: retrogrades, isLoading: loadingRetros } = useRetrogrades()

  if (loadingTransits || loadingRetros) {
    return (
      <div className="space-y-4 px-4 pb-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-4">

      {/* What are transits – educational card */}
      <FadeIn delay={0}>
        <div className="mx-4">
          <GlassCard padding="md" glowColor="none">
            <div className="flex gap-3 items-start">
              <div className="shrink-0 h-8 w-8 rounded-full bg-cyan-glow/15 flex items-center justify-center">
                <Info size={16} className="text-cyan-glow" />
              </div>
              <div>
                <p className="text-[10px] font-display font-semibold text-cyan-glow uppercase tracking-widest mb-1">
                  What are transits?
                </p>
                <p className="text-xs leading-relaxed text-text-secondary">
                  All transits start with your birth chart. As planets move through the sky today, they form angles to your natal planets — these are transits, the cosmic forces shaping your present experience.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </FadeIn>

      {/* Event of the day */}
      {transits?.eventOfDay && (
        <FadeIn delay={0.06}>
          <div className="mx-4">
            <GlassCard padding="none" glowColor="gold" className="overflow-hidden">
              <div className="flex items-center gap-2 bg-gold-accent/10 px-4 py-2.5 border-b border-gold-accent/20">
                <Zap size={14} className="text-gold-accent" />
                <span className="text-[11px] font-display font-semibold text-gold-accent uppercase tracking-widest">
                  Event of the Day
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display text-sm font-semibold text-text-primary">
                    {transits.eventOfDay.title}
                  </h3>
                  <Badge variant="gold">{transits.eventOfDay.type}</Badge>
                </div>
                <p className="text-xs text-text-muted mb-2">
                  {format(new Date(transits.eventOfDay.date), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {transits.eventOfDay.description}
                </p>
              </div>
            </GlassCard>
          </div>
        </FadeIn>
      )}

      {/* Short-term transits */}
      {transits?.shortTerm && transits.shortTerm.length > 0 && (
        <FadeIn delay={0.1}>
          <div className="px-4">
            <SectionHeader title="Your Short-Term Transits" className="mb-3" />
            <div className="space-y-2">
              {transits.shortTerm.map((t) => (
                <TransitCard key={t.id} transit={t} />
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Active retrogrades */}
      {retrogrades?.active && retrogrades.active.length > 0 && (
        <FadeIn delay={0.14}>
          <div className="px-4">
            <SectionHeader title="Active Retrogrades" className="mb-3" />
            <div className="space-y-3">
              {retrogrades.active.map((r) => (
                <RetrogradePlanetCard key={r.planet} retrograde={r} />
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Upcoming retrogrades */}
      {retrogrades?.upcoming && retrogrades.upcoming.length > 0 && (
        <FadeIn delay={0.18}>
          <div className="px-4">
            <SectionHeader title="Upcoming Retrogrades" className="mb-3" />
            <div className="grid grid-cols-2 gap-3">
              {retrogrades.upcoming.map((r) => {
                const color = PLANET_COLORS[r.planet] ?? '#94A3B8'
                const glyph = PLANET_GLYPHS[r.planet] ?? r.planet[0]
                return (
                  <div
                    key={r.planet}
                    className="glass-card rounded-2xl p-3 flex flex-col items-center gap-2 text-center"
                  >
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{
                        background: `radial-gradient(circle, ${color}25, ${color}05)`,
                        color,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {glyph}
                    </div>
                    <div>
                      <p className="font-display text-xs font-semibold text-text-primary">
                        {r.planet}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {format(new Date(r.startDate), 'MMM d')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Long-term transits */}
      {transits?.longTerm && transits.longTerm.length > 0 && (
        <FadeIn delay={0.22}>
          <div className="px-4">
            <SectionHeader title="Your Long-Term Transits" className="mb-3" />
            <div className="space-y-2">
              {transits.longTerm.map((t) => (
                <TransitCard key={t.id} transit={t} />
              ))}
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  )
}
