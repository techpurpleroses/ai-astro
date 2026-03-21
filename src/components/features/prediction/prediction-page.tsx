'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowLeft, Sparkles, TrendingUp, Heart, Briefcase, Shield } from 'lucide-react'
import Image from 'next/image'
import { FeatureGate } from '@/components/billing/feature-gate'

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.42, delay }}
    >
      {children}
    </motion.div>
  )
}

const THEMES = [
  { icon: Heart,     label: 'Love & Relationships', color: '#F43F5E', summary: 'Venus trine your natal Moon opens a powerful window for deep connection in Q3 2026.' },
  { icon: Briefcase, label: 'Career & Finances',    color: '#06B6D4', summary: 'Saturn's discipline meets Jupiter's expansion — a career breakthrough is building slowly but surely.' },
  { icon: Shield,    label: 'Health & Wellbeing',   color: '#84CC16', summary: 'Mars in your 6th house pushes you toward structure. Build the habits now that carry you through the year.' },
  { icon: TrendingUp,label: 'Personal Growth',      color: '#A78BFA', summary: 'Your progressed Sun moves into a new sign this year — a major identity shift is underway.' },
]

export function PredictionClient() {
  const router = useRouter()

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(10,22,40,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <button
          onClick={() => router.back()}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6"
        >
          <ArrowLeft size={15} className="text-text-secondary" />
        </button>
        <div>
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">FEATURES</p>
          <h1 className="font-display text-base font-bold text-text-primary">Prediction Report</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* Hero image */}
        <FadeIn delay={0}>
          <div
            className="rounded-3xl overflow-hidden"
            style={{ border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <div className="relative w-full h-44">
              <Image
                src="/assets/prediction-2026.png"
                alt="2026 Prediction Report"
                fill
                className="object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(10,22,40,0.9) 30%, rgba(10,22,40,0.2))' }}
              />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="font-mystical text-base text-[#F4E2B4]">Your 2026 Cosmic Forecast</p>
                <p className="text-[10px] text-text-muted mt-0.5">Full-year AI prediction · Powered by your birth chart</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Gated content */}
        <FadeIn delay={0.08}>
          <FeatureGate feature="prediction.report">
            <div className="space-y-3">
              {THEMES.map(({ icon: Icon, label, color, summary }) => (
                <div
                  key={label}
                  className="glass-card rounded-2xl p-4 flex gap-3 items-start"
                  style={{ border: `1px solid ${color}18` }}
                >
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${color}15`, border: `1px solid ${color}25` }}
                  >
                    <Icon size={15} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-xs font-bold text-text-primary mb-1">{label}</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{summary}</p>
                  </div>
                </div>
              ))}

              {/* Full report CTA */}
              <div
                className="rounded-2xl p-4 flex flex-col items-center gap-3 text-center"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Sparkles size={20} className="text-violet-400" />
                <p className="font-display text-sm font-bold text-text-primary">Full Personalized Report</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Your complete 2026 forecast — every transit, progression, and solar return insight compiled into a detailed cosmic report.
                </p>
              </div>
            </div>
          </FeatureGate>
        </FadeIn>

      </div>
    </div>
  )
}
