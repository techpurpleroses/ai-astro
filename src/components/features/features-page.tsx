'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ChevronRight, Sparkles, Lock, Settings } from 'lucide-react'
import Image from 'next/image'
import { useStoryCategories } from '@/hooks/use-stories'
import { usePlan } from '@/hooks/use-plan'

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.38, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}

interface FeatureCardProps {
  imageSrc: string
  imageAlt: string
  title: string
  subtitle: string
  description: string
  isPro?: boolean
  gradient: string
  borderColor: string
  accentColor: string
  onClick: () => void
  extra?: React.ReactNode
}

function FeatureCard({
  imageSrc, imageAlt, title, subtitle, description, isPro, gradient, borderColor, accentColor, onClick, extra,
}: FeatureCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      className="w-full rounded-2xl overflow-hidden text-left"
      style={{
        background: 'rgba(14,27,49,0.85)',
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Header strip */}
      <div className="px-4 py-4 flex items-center gap-4" style={{ background: gradient }}>
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.28)', border: `1px solid ${accentColor}30` }}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={56}
            height={56}
            className="object-contain p-1"
            unoptimized
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-display text-base font-bold text-text-primary">{title}</span>
            {isPro && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  color: '#F59E0B',
                }}
              >
                <Lock size={8} />
                PRO
              </span>
            )}
          </div>
          <p className="text-[10px] font-display uppercase tracking-widest" style={{ color: accentColor }}>
            {subtitle}
          </p>
        </div>

        <ChevronRight size={16} className="text-text-muted shrink-0" />
      </div>

      {/* Description */}
      <div className="px-4 py-3">
        <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
      </div>

      {extra}
    </motion.button>
  )
}

// ── Palm metric bars preview ──────────────────────────────────────────────────

function PalmMetricPreview() {
  const metrics = [
    { label: 'Sensitivity',   value: 78, color: '#F43F5E' },
    { label: 'Longevity',     value: 85, color: '#84CC16' },
    { label: 'Intelligence',  value: 92, color: '#06B6D4' },
    { label: 'Ambition',      value: 71, color: '#F59E0B' },
  ]
  return (
    <div className="px-4 pb-4 space-y-2">
      {metrics.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[9px] text-text-muted font-display w-16">{label}</span>
          <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              style={{ background: color }}
            />
          </div>
          <span className="text-[9px] text-text-muted w-5 text-right">{value}%</span>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FeaturesClient() {
  const router = useRouter()
  const { canAccess } = usePlan()
  const { data: storiesData } = useStoryCategories()
  const storyCategories = storiesData ?? []

  const palmLocked = !canAccess('palm.scan')
  const soulmateLocked = !canAccess('soulmate.generate')
  const predictionLocked = !canAccess('prediction.report')

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(10,22,40,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)' }}
        >
          <Sparkles size={15} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">MYSTIC TOOLS</p>
          <h1 className="font-display text-base font-bold text-text-primary leading-tight">Features</h1>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6 border border-white/10"
        >
          <Settings size={14} className="text-text-secondary" />
        </button>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-3">

        {/* Palm Reading */}
        <FadeIn delay={0}>
          <FeatureCard
            imageSrc="/assets/features/palm-reading-hq.jpg"
            imageAlt="Palm reading"
            title="Palm Reading"
            subtitle="Palmistry Analysis"
            description="Unlock the secrets of your hand lines. Discover your sensitivity, longevity, intelligence, and ambition through ancient palmistry."
            isPro={palmLocked}
            gradient="linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(244,63,94,0.04) 100%)"
            borderColor={palmLocked ? 'rgba(244,63,94,0.15)' : 'rgba(244,63,94,0.25)'}
            accentColor="#F43F5E"
            onClick={() => router.push('/features/palm-reading')}
            extra={<PalmMetricPreview />}
          />
        </FadeIn>

        {/* Tarot */}
        <FadeIn delay={0.06}>
          <FeatureCard
            imageSrc="/assets/prediction-2026.png"
            imageAlt="Tarot cards"
            title="Tarot"
            subtitle="Card Readings"
            description="Card of the Day, Near Future, Love & Relationships, and Yes or No readings. Let the cards reveal what the universe wants you to know."
            gradient="linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(167,139,250,0.04) 100%)"
            borderColor="rgba(167,139,250,0.2)"
            accentColor="#A78BFA"
            onClick={() => router.push('/features/tarot')}
          />
        </FadeIn>

        {/* Soulmate */}
        <FadeIn delay={0.12}>
          <FeatureCard
            imageSrc="/assets/soulmate-sketch.webp"
            imageAlt="Soulmate birth chart"
            title="Soulmate by Birth Chart"
            subtitle="Cosmic Love Match"
            description="Using your natal chart, discover who your cosmic soulmate is — their zodiac signature, timing of your meeting, and relationship potential."
            isPro={soulmateLocked}
            gradient="linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 100%)"
            borderColor={soulmateLocked ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.25)'}
            accentColor="#06B6D4"
            onClick={() => router.push('/features/soulmate')}
          />
        </FadeIn>

        {/* Prediction Report */}
        <FadeIn delay={0.18}>
          <FeatureCard
            imageSrc="/assets/prediction-2026.png"
            imageAlt="Prediction report"
            title="Prediction Report"
            subtitle="Year Ahead Forecast"
            description="A full AI-powered cosmic forecast for the year ahead — love, career, health, and life themes decoded from your birth chart."
            isPro={predictionLocked}
            gradient="linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)"
            borderColor={predictionLocked ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.25)'}
            accentColor="#6366F1"
            onClick={() => router.push('/features/prediction')}
          />
        </FadeIn>

        {/* Magic Ball */}
        <FadeIn delay={0.24}>
          <FeatureCard
            imageSrc="/assets/magic-ball.png"
            imageAlt="Magic ball oracle"
            title="Magic Ball"
            subtitle="Ask the Oracle"
            description="Focus your question, ask the cosmic oracle, and receive your answer. The universe speaks in mysterious ways — are you ready to listen?"
            gradient="linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)"
            borderColor="rgba(245,158,11,0.2)"
            accentColor="#F59E0B"
            onClick={() => router.push('/today?section=horoscope')}
          />
        </FadeIn>

        {/* Story */}
        <FadeIn delay={0.22}>
          <FeatureCard
            imageSrc="/assets/astrocartography.png"
            imageAlt="Astro stories"
            title="Story"
            subtitle="Learn and Explore"
            description="Browse short visual lessons across archetypes, moon phases, rituals, retrogrades, and practical astrology."
            gradient="linear-gradient(135deg, rgba(34,211,238,0.12) 0%, rgba(34,211,238,0.04) 100%)"
            borderColor="rgba(34,211,238,0.2)"
            accentColor="#22D3EE"
            onClick={() => router.push('/features/story')}
          />
        </FadeIn>

        {/* Story category chips */}
        {storyCategories.length > 0 && (
          <FadeIn delay={0.26}>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 pt-1">
              {storyCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => router.push(`/features/story/${category.id}`)}
                  className="shrink-0 flex flex-col items-center gap-2"
                  style={{ width: 64 }}
                >
                  {/* Circle icon with accent border + glow */}
                  <div
                    className="relative rounded-full overflow-hidden"
                    style={{
                      width: 60,
                      height: 60,
                      border: `2px solid ${category.accent}55`,
                      boxShadow: `0 0 14px ${category.accent}28`,
                    }}
                  >
                    <Image
                      src={category.image}
                      alt={category.title}
                      width={60}
                      height={60}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                    {/* Subtle inner gradient overlay */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${category.accent}22 0%, transparent 60%)`,
                      }}
                    />
                  </div>

                  {/* Title */}
                  <div className="text-center" style={{ width: 64 }}>
                    <p
                      className="font-display text-[11px] font-bold leading-tight text-text-primary"
                      style={{
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {category.title}
                    </p>
                    <p className="text-[9px] text-text-muted truncate mt-0.5 leading-none">
                      {category.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </FadeIn>
        )}

      </div>
    </div>
  )
}
