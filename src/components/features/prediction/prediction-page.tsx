'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowLeft, Sparkles, TrendingUp, Heart, Briefcase, Shield } from 'lucide-react'
import Image from 'next/image'
import { FeatureGate } from '@/components/billing/feature-gate'
import { useUserProfile } from '@/hooks/use-profile'

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

// ── Element lookup ─────────────────────────────────────────────────────────────

type Element = 'fire' | 'earth' | 'air' | 'water'

const SIGN_ELEMENT: Record<string, Element> = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
}

interface ThemeSummaries {
  love: string
  career: string
  health: string
  growth: string
}

const THEMES_BY_ELEMENT: Record<Element, ThemeSummaries> = {
  fire: {
    love:    'Venus ignites your already magnetic energy in Q3 2026 — a bold, passionate connection you didn\'t see coming is on the horizon.',
    career:  'Your natural drive gets a Jupiter boost this year. A leadership opportunity will test your confidence — take it.',
    health:  'Your high-energy nature peaks mid-year. Channel that fire into consistent movement before the year\'s final quarter asks for rest.',
    growth:  'Your progressed Sun deepens your sense of purpose. This is the year you stop chasing and start building.',
  },
  earth: {
    love:    'Venus trine your natal Moon in Q3 2026 opens a steady, deeply rooted connection — the kind built to last.',
    career:  'Saturn\'s discipline rewards your patience this year. The slow project you\'ve been building is about to bear fruit.',
    health:  'Mars in your 6th house asks you to establish structure now. The routines you build this year carry you for the next three.',
    growth:  'Your progressed Sun moves into new territory — a quiet but profound identity shift is already underway.',
  },
  air: {
    love:    'Mercury and Venus align in your relationship sector this summer. A meeting of minds becomes something much deeper.',
    career:  'Your ideas finally find the right audience in 2026. Jupiter\'s expansion meets your natural curiosity — pitch the vision.',
    health:  'Mental clarity is your wellness target this year. Reduce scattered energy and the physical benefits follow naturally.',
    growth:  'Your progressed Sun asks you to commit to one path. The breadth you\'ve gathered is now ready to go deep.',
  },
  water: {
    love:    'Neptune heightens your intuitive sense of connection in Q3 2026 — you\'ll know before they say a word.',
    career:  'Your emotional intelligence is your greatest professional asset this year. Lead with empathy and results follow.',
    health:  'Emotional and physical wellness are deeply linked for you in 2026. Prioritize rest and creative expression equally.',
    growth:  'Your progressed Sun illuminates long-buried gifts. What you once called a flaw reveals itself as your greatest strength.',
  },
}

const FALLBACK_THEMES = THEMES_BY_ELEMENT.water

export function PredictionClient() {
  const router = useRouter()
  const { data: profile } = useUserProfile()

  const element = SIGN_ELEMENT[profile?.sunSign?.toLowerCase() ?? ''] ?? null
  const summaries = element ? THEMES_BY_ELEMENT[element] : FALLBACK_THEMES

  const THEMES = [
    { icon: Heart,      label: 'Love & Relationships', color: '#F43F5E', summary: summaries.love    },
    { icon: Briefcase,  label: 'Career & Finances',    color: '#06B6D4', summary: summaries.career  },
    { icon: Shield,     label: 'Health & Wellbeing',   color: '#84CC16', summary: summaries.health  },
    { icon: TrendingUp, label: 'Personal Growth',      color: '#A78BFA', summary: summaries.growth  },
  ]

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
