'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Heart, ChevronDown, ChevronUp, Crown, ChevronRight, Users, Settings } from 'lucide-react'
import Image from 'next/image'
import { ZodiacGrid } from './zodiac-grid'
import { ScoreRing, CategoryBar } from './report-score-ring'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { SkeletonCard } from '@/components/ui/skeleton'
import { FeatureGate } from '@/components/billing/feature-gate'
import { useCompatibility, useCompatibilityPair } from '@/hooks/use-compatibility'
import type { CompatibilityScore } from '@/types'

const SIGN_COLORS: Record<string, string> = {
  Aries: '#EF4444', Taurus: '#84CC16', Gemini: '#F59E0B',
  Cancer: '#06B6D4', Leo: '#F59E0B', Virgo: '#84CC16',
  Libra: '#A78BFA', Scorpio: '#06B6D4', Sagittarius: '#EF4444',
  Capricorn: '#78716C', Aquarius: '#F59E0B', Pisces: '#6366F1',
}

const SIGN_GLYPHS: Record<string, string> = {
  Aries: 'A', Taurus: 'T', Gemini: 'G', Cancer: 'C',
  Leo: 'L', Virgo: 'V', Libra: 'Li', Scorpio: 'Sc',
  Sagittarius: 'Sa', Capricorn: 'Cp', Aquarius: 'Aq', Pisces: 'P',
}

const TODAY_CATEGORY_TABS = [
  { id: 'love', label: 'Love', color: '#F43F5E' },
  { id: 'career', label: 'Career', color: '#06B6D4' },
  { id: 'friendship', label: 'Friends', color: '#84CC16' },
  { id: 'sex', label: 'Intimacy', color: '#A78BFA' },
] as const

const BEST_MATCH_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo']

type TodayCategory = (typeof TODAY_CATEGORY_TABS)[number]['id']

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

function SignSelectorButton({ label, sign, onClick }: { label: string; sign: string | null; onClick: () => void }) {
  const color = sign ? (SIGN_COLORS[sign] ?? '#06B6D4') : '#4E6179'
  const glyph = sign ? (SIGN_GLYPHS[sign] ?? '?') : '+'
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
      style={{
        background: sign ? `${color}12` : 'rgba(255,255,255,0.04)',
        border: sign ? `1px solid ${color}40` : '1px dashed rgba(255,255,255,0.15)',
      }}
    >
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold"
        style={{
          background: sign ? `${color}18` : 'rgba(255,255,255,0.06)',
          color: sign ? color : '#4E6179',
          border: sign ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {glyph}
      </div>
      <p
        className="text-[10px] font-display font-semibold uppercase tracking-widest"
        style={{ color: sign ? color : '#4E6179' }}
      >
        {sign ?? label}
      </p>
    </button>
  )
}

function CompatibilityReport({ report }: { report: CompatibilityScore }) {
  const [expanded, setExpanded] = useState(false)
  const categoryBars = [
    { label: 'Love', score: report.love, color: '#F43F5E' },
    { label: 'Career', score: report.career, color: '#06B6D4' },
    { label: 'Friendship', score: report.friendship, color: '#84CC16' },
    { label: 'Intimacy', score: report.sex, color: '#A78BFA' },
  ]

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <ScoreRing score={report.overall} label="Overall" color="#06B6D4" />
        <div className="flex-1 space-y-2">
          {categoryBars.map((bar) => <CategoryBar key={bar.label} {...bar} />)}
        </div>
      </div>
      <div className="px-4 pb-3">
        <p className="text-xs leading-relaxed text-text-secondary">{report.summary}</p>
      </div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-white/6 text-[10px] font-display font-semibold text-text-muted uppercase tracking-widest active:bg-white/4"
      >
        <span>{expanded ? 'Hide Details' : 'See Details'}</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div>
                <p className="text-[10px] font-display font-semibold text-lime-accent uppercase tracking-widest mb-1.5">Strengths</p>
                {report.strengths.map((strength) => (
                  <div key={strength} className="flex items-start gap-2 mb-1">
                    <span className="text-lime-accent mt-0.5">*</span>
                    <p className="text-xs text-text-secondary">{strength}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-display font-semibold text-rose-accent uppercase tracking-widest mb-1.5">Challenges</p>
                {report.challenges.map((challenge) => (
                  <div key={challenge} className="flex items-start gap-2 mb-1">
                    <span className="text-rose-accent mt-0.5">*</span>
                    <p className="text-xs text-text-secondary">{challenge}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TodaysMatchesSection() {
  const router = useRouter()
  const { data } = useCompatibility()
  const [activeCategory, setActiveCategory] = useState<TodayCategory>('love')
  if (!data) return null
  const matches = data.todaysMatches[activeCategory]

  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm font-bold text-text-primary">Today&apos;s Matches</h2>
      <div className="flex gap-1.5">
        {TODAY_CATEGORY_TABS.map((tab) => {
          const isActive = tab.id === activeCategory
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className="flex-1 py-1.5 rounded-full text-[9px] font-display font-semibold uppercase tracking-wider transition-all"
              style={{
                color: isActive ? tab.color : '#4E6179',
                background: isActive ? `${tab.color}15` : 'rgba(255,255,255,0.04)',
                border: isActive ? `1px solid ${tab.color}35` : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="space-y-2"
        >
          {matches.map((match) => {
            const c1 = SIGN_COLORS[match.sign1] ?? '#06B6D4'
            const c2 = SIGN_COLORS[match.sign2] ?? '#06B6D4'
            const isGood = match.score >= 70
            return (
              <div key={`${match.sign1}-${match.sign2}`} className="glass-card rounded-2xl p-3 flex items-center gap-3">
                <div className="flex items-center gap-1 shrink-0">
                  <div className="h-10 w-10 rounded-full overflow-hidden" style={{ background: `${c1}18`, border: `1px solid ${c1}30` }}>
                    <Image src={`/assets/zodiac/${match.sign1.toLowerCase()}.png`} alt={match.sign1} width={40} height={40} className="object-cover w-full h-full" />
                  </div>
                  <span className="text-text-muted text-sm mx-0.5">x</span>
                  <div className="h-10 w-10 rounded-full overflow-hidden" style={{ background: `${c2}18`, border: `1px solid ${c2}30` }}>
                    <Image src={`/assets/zodiac/${match.sign2.toLowerCase()}.png`} alt={match.sign2} width={40} height={40} className="object-cover w-full h-full" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-xs font-semibold text-text-primary">{match.sign1} and {match.sign2}</p>
                  <p className="text-[10px] text-text-secondary leading-snug line-clamp-1 mt-0.5">{match.note}</p>
                </div>
                <div className="shrink-0">
                  <span className="font-display text-lg font-bold" style={{ color: isGood ? '#84CC16' : '#EF4444' }}>
                    {isGood ? '+' : '-'}
                  </span>
                </div>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>
      <button
        onClick={() => router.push('/compatibility/today-matches')}
        className="w-full rounded-full py-2.5 font-display font-semibold text-midnight-950"
        style={{ background: 'linear-gradient(135deg, #22D3EE, #06B6D4)' }}
      >
        Read more
      </button>
    </div>
  )
}

export function CompatibilityClient() {
  const router = useRouter()
  const [sign1, setSign1] = useState<string | null>('Scorpio')
  const [sign2, setSign2] = useState<string | null>(null)
  const [selectingSlot, setSelectingSlot] = useState<1 | 2 | null>(null)

  // Live per-pair report from provider
  const { data: report, isLoading: isReportLoading } = useCompatibilityPair(sign1, sign2)

  const handleSelect = (sign: string) => {
    if (selectingSlot === 1) setSign1(sign)
    if (selectingSlot === 2) setSign2(sign)
    setSelectingSlot(null)
  }

  return (
    <div className="flex flex-col">
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)' }}>
          <Heart size={15} className="text-rose-accent" />
        </div>
        <div className="flex-1">
          <p className="font-mystical text-[10px] text-text-muted tracking-widest">ZODIAC</p>
          <h1 className="font-display text-base font-bold text-text-primary leading-tight">Compatibility</h1>
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

      <div className="space-y-5 px-4 pt-4 pb-6">
        <FadeIn delay={0}>
          <button
            onClick={() => router.push('/settings/reports/soulmate-sketch')}
            className="w-full text-left glass-card rounded-2xl overflow-hidden active:bg-white/5 transition-colors"
            style={{ border: '1px solid rgba(6,182,212,0.2)' }}
          >
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(6,182,212,0.03) 100%)' }}>
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(6,182,212,0.25)' }}>
                <Image src="/assets/soulmate-sketch.webp" alt="Soulmate" width={48} height={48} className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-display text-sm font-bold text-text-primary">Your Soulmate</span>
                  <span className="text-[9px] font-display font-bold text-gold-accent bg-gold-accent/15 border border-gold-accent/30 px-1.5 py-0.5 rounded-full uppercase">PRO</span>
                </div>
                <p className="text-[10px] font-display uppercase tracking-widest text-cyan-glow">By Birth Chart</p>
              </div>
              <ChevronRight size={16} className="text-text-muted shrink-0" />
            </div>
            <div className="px-4 py-2.5">
              <p className="text-xs text-text-secondary">An advisor reveals who fits you best based on your natal chart and cosmic signature.</p>
            </div>
          </button>
        </FadeIn>

        <FadeIn delay={0.06}>
          <div className="space-y-3">
            <h2 className="font-display text-sm font-bold text-text-primary">Zodiac Sign Compatibility</h2>
            <div className="glass-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <SignSelectorButton label="Your Sign" sign={sign1} onClick={() => setSelectingSlot(1)} />
                <span className="text-xl text-text-muted font-display shrink-0">+</span>
                <SignSelectorButton label="Their Sign" sign={sign2} onClick={() => setSelectingSlot(2)} />
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <Users size={10} className="text-text-muted" />
                <span className="text-[10px] text-text-muted font-display">505 Reports delivered today</span>
              </div>
              {sign1 && sign2 && isReportLoading && (
                <p className="text-center text-[10px] text-cyan-glow animate-pulse">Loading compatibility…</p>
              )}
              {sign1 && sign2 && !isReportLoading && !report && (
                <p className="text-center text-[10px] text-text-muted">No report available for {sign1} and {sign2} yet.</p>
              )}
            </div>
          </div>
        </FadeIn>

        {report && sign1 && sign2 && (
          <FadeIn delay={0.1}>
            <FeatureGate feature="compatibility.deep">
              <CompatibilityReport report={report} />
            </FeatureGate>
          </FadeIn>
        )}

        <FadeIn delay={0.14}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-text-primary">Best Matches for 12 Signs</h2>
              <button
                onClick={() => router.push('/compatibility/best-matches')}
                className="text-[10px] text-cyan-glow font-display"
              >
                See all &gt;
              </button>
            </div>
            <p className="text-[10px] text-text-muted">Find compatible partners and best zodiac couples</p>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
              {BEST_MATCH_SIGNS.map((sign) => {
                const color = SIGN_COLORS[sign] ?? '#06B6D4'
                return (
                  <button
                    key={sign}
                    onClick={() => {
                      setSign1(sign)
                      setSelectingSlot(null)
                    }}
                    className="shrink-0 flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all active:scale-95"
                    style={{ background: `${color}10`, border: `1px solid ${color}25`, minWidth: 64 }}
                  >
                    <div className="h-11 w-11 rounded-full overflow-hidden" style={{ border: `1px solid ${color}30` }}>
                      <Image src={`/assets/zodiac/${sign.toLowerCase()}.png`} alt={sign} width={44} height={44} className="object-cover w-full h-full" />
                    </div>
                    <span className="text-[9px] font-display font-semibold" style={{ color }}>{sign}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </FadeIn>

        <div className="h-px bg-white/6" />

        <FadeIn delay={0.2}>
          <TodaysMatchesSection />
        </FadeIn>
      </div>

      <BottomSheet
        open={!!selectingSlot}
        onClose={() => setSelectingSlot(null)}
        title={selectingSlot === 1 ? 'Choose Your Sign' : 'Choose Their Sign'}
      >
        <ZodiacGrid selected={selectingSlot === 1 ? sign1 : sign2} onSelect={handleSelect} />
      </BottomSheet>
    </div>
  )
}

