'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowLeft, Stars, Heart, Sparkles } from 'lucide-react'

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

// ── Soulmate sketch portrait SVG ──────────────────────────────────────────────

function SoulmatePortrait() {
  return (
    <div
      className="rounded-3xl overflow-hidden p-6 flex flex-col items-center gap-4"
      style={{
        background: 'linear-gradient(160deg, rgba(6,182,212,0.08), rgba(15,30,53,0.9))',
        border: '1px solid rgba(6,182,212,0.2)',
      }}
    >
      {/* Abstract portrait */}
      <div className="relative">
        <div
          className="h-28 w-28 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.2), rgba(6,182,212,0.04))',
            border: '1px solid rgba(6,182,212,0.3)',
            boxShadow: '0 0 40px rgba(6,182,212,0.15)',
          }}
        >
          <Stars size={40} className="text-cyan-glow" style={{ opacity: 0.7 }} />
        </div>
        <div
          className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(244,63,94,0.2)', border: '1px solid rgba(244,63,94,0.4)' }}
        >
          <Heart size={14} className="text-rose-accent" />
        </div>
      </div>

      <div className="text-center">
        <p className="font-mystical text-sm text-cyan-glow mb-1">Your Cosmic Soulmate</p>
        <p className="text-xs text-text-muted">Based on your Scorpio Sun · Cancer Moon · Aquarius Rising</p>
      </div>
    </div>
  )
}

// ── Section block ─────────────────────────────────────────────────────────────

function SectionBlock({
  title,
  accentColor,
  children,
}: {
  title: string
  accentColor: string
  children: React.ReactNode
}) {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-1 w-4 rounded-full" style={{ background: accentColor }} />
        <p className="font-display text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SoulmateClient() {
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
          <h1 className="font-display text-base font-bold text-text-primary">Soulmate by Birth Chart</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4">

        <FadeIn delay={0}>
          <SoulmatePortrait />
        </FadeIn>

        <FadeIn delay={0.08}>
          <SectionBlock title="Their Zodiac Profile" accentColor="#06B6D4">
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { label: 'Sun Sign',    value: 'Capricorn', glyph: '♑', color: '#78716C' },
                { label: 'Moon Sign',   value: 'Pisces',    glyph: '♓', color: '#6366F1' },
                { label: 'Rising Sign', value: 'Libra',     glyph: '♎', color: '#A78BFA' },
              ].map(({ label, value, glyph, color }) => (
                <div key={label}
                  className="rounded-xl p-2.5 flex flex-col items-center gap-1 text-center"
                  style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                >
                  <span className="text-xl" style={{ color }}>{glyph}</span>
                  <p className="text-[9px] text-text-muted">{label}</p>
                  <p className="text-[10px] font-display font-bold text-text-primary">{value}</p>
                </div>
              ))}
            </div>
          </SectionBlock>
        </FadeIn>

        <FadeIn delay={0.14}>
          <SectionBlock title="Connection Type" accentColor="#F43F5E">
            <p className="text-sm text-text-secondary leading-relaxed">
              Your charts reveal a <strong className="text-text-primary">karmic soulmate bond</strong> — a connection forged in past lives and destined to continue in this one. The magnetic pull you'll feel is not coincidence; it's cosmic recognition.
            </p>
          </SectionBlock>
        </FadeIn>

        <FadeIn delay={0.18}>
          <SectionBlock title="Timing of Meeting" accentColor="#84CC16">
            <div className="space-y-2">
              <p className="text-sm text-text-secondary leading-relaxed">
                Jupiter's transit through your 7th house in late 2026 creates the most powerful window for meeting your soulmate. Key dates to remain open:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['Oct 12–28, 2026', 'Dec 3–20, 2026'].map((date) => (
                  <div key={date}
                    className="rounded-xl px-3 py-2 text-center"
                    style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.2)' }}
                  >
                    <p className="text-[10px] font-display font-semibold text-lime-accent">{date}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionBlock>
        </FadeIn>

        <FadeIn delay={0.22}>
          <SectionBlock title="Your Magnetic Qualities" accentColor="#F59E0B">
            <ul className="space-y-1.5">
              {[
                'Intense emotional depth that draws souls seeking transformation',
                'Psychic sensitivity that creates instant recognition between soulmates',
                "Loyalty that others sense even before you've spoken",
              ].map((q, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Sparkles size={11} className="text-gold-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-text-secondary">{q}</p>
                </li>
              ))}
            </ul>
          </SectionBlock>
        </FadeIn>

        <FadeIn delay={0.26}>
          <SectionBlock title="Compatibility Aspects" accentColor="#A78BFA">
            <p className="text-sm text-text-secondary leading-relaxed">
              Your Scorpio-Capricorn Venus synastry creates profound sexual and emotional compatibility. Their Pisces Moon will harmonize deeply with your Cancer Moon — you'll feel immediately understood in ways that surprise both of you.
            </p>
          </SectionBlock>
        </FadeIn>

      </div>
    </div>
  )
}
