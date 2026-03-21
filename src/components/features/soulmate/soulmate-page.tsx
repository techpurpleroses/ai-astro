'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowLeft, Heart, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { FeatureGate } from '@/components/billing/feature-gate'
import { useBirthChart } from '@/hooks/use-birth-chart'
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

// ── Soulmate compatibility lookup ─────────────────────────────────────────────

const SIGN_GLYPHS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
}

const SIGN_COLORS: Record<string, string> = {
  aries: '#F43F5E', taurus: '#84CC16', gemini: '#FACC15', cancer: '#06B6D4',
  leo: '#F59E0B', virgo: '#84CC16', libra: '#A78BFA', scorpio: '#EF4444',
  sagittarius: '#F59E0B', capricorn: '#78716C', aquarius: '#06B6D4', pisces: '#6366F1',
}

interface SoulmateProfile {
  sun: string; moon: string; rising: string
}

const SOULMATE_BY_SUN: Record<string, SoulmateProfile> = {
  aries:       { sun: 'Leo',         moon: 'Sagittarius', rising: 'Aries'       },
  taurus:      { sun: 'Virgo',       moon: 'Capricorn',   rising: 'Taurus'      },
  gemini:      { sun: 'Libra',       moon: 'Aquarius',    rising: 'Gemini'      },
  cancer:      { sun: 'Scorpio',     moon: 'Pisces',      rising: 'Cancer'      },
  leo:         { sun: 'Aries',       moon: 'Sagittarius', rising: 'Leo'         },
  virgo:       { sun: 'Taurus',      moon: 'Capricorn',   rising: 'Virgo'       },
  libra:       { sun: 'Gemini',      moon: 'Aquarius',    rising: 'Libra'       },
  scorpio:     { sun: 'Capricorn',   moon: 'Pisces',      rising: 'Libra'       },
  sagittarius: { sun: 'Aries',       moon: 'Leo',         rising: 'Sagittarius' },
  capricorn:   { sun: 'Taurus',      moon: 'Virgo',       rising: 'Capricorn'   },
  aquarius:    { sun: 'Gemini',      moon: 'Libra',       rising: 'Aquarius'    },
  pisces:      { sun: 'Cancer',      moon: 'Scorpio',     rising: 'Pisces'      },
}

const FALLBACK_PROFILE: SoulmateProfile = { sun: 'Capricorn', moon: 'Pisces', rising: 'Libra' }

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function soulmateGlyph(sign: string) {
  return SIGN_GLYPHS[sign.toLowerCase()] ?? '✦'
}

function soulmateColor(sign: string) {
  return SIGN_COLORS[sign.toLowerCase()] ?? '#A78BFA'
}

// ── Soulmate sketch portrait ───────────────────────────────────────────────────

function SoulmatePortrait({ subtitle }: { subtitle: string }) {
  return (
    <div
      className="rounded-3xl overflow-hidden flex flex-col items-center gap-4"
      style={{
        background: 'linear-gradient(160deg, rgba(6,182,212,0.08), rgba(15,30,53,0.9))',
        border: '1px solid rgba(6,182,212,0.2)',
      }}
    >
      <div className="relative w-full aspect-square max-h-64">
        <Image
          src="/assets/soulmate-sketch.webp"
          alt="Soulmate sketch"
          fill
          className="object-cover"
        />
        {/* Gradient fade at bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: 'linear-gradient(to top, rgba(10,22,40,0.95), transparent)' }}
        />
        {/* Heart badge */}
        <div
          className="absolute bottom-3 right-3 h-8 w-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(244,63,94,0.2)', border: '1px solid rgba(244,63,94,0.4)' }}
        >
          <Heart size={14} className="text-rose-accent" />
        </div>
      </div>
      <div className="text-center px-4 pb-4">
        <p className="font-mystical text-sm text-cyan-glow mb-1">Your Cosmic Soulmate</p>
        <p className="text-xs text-text-muted">{subtitle}</p>
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
  const { data: profile } = useUserProfile()
  const { data: chart } = useBirthChart()

  // Derive user Big Three
  const userSun       = chart?.bigThree.sun.sign       ?? profile?.sunSign       ?? 'scorpio'
  const userMoon      = chart?.bigThree.moon.sign      ?? 'cancer'
  const userAscendant = chart?.bigThree.ascendant.sign ?? 'aquarius'

  const sunKey = userSun.toLowerCase()
  const soulmate = SOULMATE_BY_SUN[sunKey] ?? FALLBACK_PROFILE

  const subtitle = `Based on your ${capitalize(userSun)} Sun · ${capitalize(userMoon)} Moon · ${capitalize(userAscendant)} Rising`

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
          <SoulmatePortrait subtitle={subtitle} />
        </FadeIn>

        <FadeIn delay={0.08}>
          <FeatureGate feature="soulmate.generate">
            <div className="space-y-4">
              <SectionBlock title="Their Zodiac Profile" accentColor="#06B6D4">
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { label: 'Sun Sign',    value: soulmate.sun,    glyph: soulmateGlyph(soulmate.sun),    color: soulmateColor(soulmate.sun)    },
                    { label: 'Moon Sign',   value: soulmate.moon,   glyph: soulmateGlyph(soulmate.moon),   color: soulmateColor(soulmate.moon)   },
                    { label: 'Rising Sign', value: soulmate.rising, glyph: soulmateGlyph(soulmate.rising), color: soulmateColor(soulmate.rising) },
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

              <SectionBlock title="Connection Type" accentColor="#F43F5E">
                <p className="text-sm text-text-secondary leading-relaxed">
                  Your charts reveal a <strong className="text-text-primary">karmic soulmate bond</strong> — a connection forged in past lives and destined to continue in this one. The magnetic pull you'll feel is not coincidence; it's cosmic recognition.
                </p>
              </SectionBlock>

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

              <SectionBlock title="Compatibility Aspects" accentColor="#A78BFA">
                <p className="text-sm text-text-secondary leading-relaxed">
                  Your {capitalize(userSun)}-{soulmate.sun} Venus synastry creates profound emotional compatibility. Their {soulmate.moon} Moon will harmonize with your {capitalize(userMoon)} Moon — you'll feel understood in ways that surprise both of you.
                </p>
              </SectionBlock>
            </div>
          </FeatureGate>
        </FadeIn>

      </div>
    </div>
  )
}
