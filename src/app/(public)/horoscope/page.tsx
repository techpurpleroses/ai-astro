'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BRAND_NAME } from '@/lib/brand'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles, Star, Sun, Moon, Zap } from 'lucide-react'

const SIGNS = [
  { name: 'Aries', file: 'aries' }, { name: 'Taurus', file: 'taurus' },
  { name: 'Gemini', file: 'gemini' }, { name: 'Cancer', file: 'cancer' },
  { name: 'Leo', file: 'leo' }, { name: 'Virgo', file: 'virgo' },
  { name: 'Libra', file: 'libra' }, { name: 'Scorpio', file: 'scorpio' },
  { name: 'Sagittarius', file: 'sagittarius' }, { name: 'Capricorn', file: 'capricorn' },
  { name: 'Aquarius', file: 'aquarius' }, { name: 'Pisces', file: 'pisces' },
]

const PREVIEW_READINGS: Record<string, { focus: string; love: string; career: string }> = {
  Aries:       { focus: 'Mars ignites your ambitions. A bold move taken today ripples for weeks.', love: 'Venus in your 7th stirs magnetic attraction. Be open.', career: 'Jupiter favours risk-takers. Pitch your biggest idea now.' },
  Taurus:      { focus: 'Venus blesses your senses. Beauty and abundance flow toward you.', love: 'Deep emotional connection is available if you lower your guard.', career: 'Financial opportunities crystallise. Review contracts carefully.' },
  Gemini:      { focus: 'Mercury sharpens your mind to a razor edge. Write, speak, create.', love: 'Playful banter leads somewhere meaningful tonight.', career: 'A conversation opens a door you did not know existed.' },
  Cancer:      { focus: 'The Moon illuminates your emotional landscape. Trust your gut.', love: 'Vulnerability is your superpower right now. Open your heart.', career: 'Home-based projects thrive. Creative work especially.' },
  Leo:         { focus: 'The Sun charges your charisma. You are impossible to ignore today.', love: 'Romance is theatrical and delightful — lean into it fully.', career: 'Leadership moments arise. Step forward with confidence.' },
  Virgo:       { focus: 'Mercury gifts you precision. Systems and routines pay dividends.', love: 'Small, thoughtful gestures speak louder than grand words.', career: 'Detail-oriented work earns recognition. Polish everything.' },
  Libra:       { focus: 'Venus invites harmony. Seek balance in all decisions today.', love: 'Partnership energy peaks. Deepen existing bonds.', career: 'Collaboration trumps solo effort. Co-create something great.' },
  Scorpio:     { focus: 'Pluto drives transformation. Release what no longer serves you.', love: 'Intensity creates intimacy. Dive deeper with those you trust.', career: 'Behind-the-scenes work yields powerful results.' },
  Sagittarius: { focus: 'Jupiter expands your horizons. Think bigger than you thought possible.', love: 'Adventure and romance intertwine beautifully today.', career: 'Publishing, travel, or education opportunities sparkle.' },
  Capricorn:   { focus: 'Saturn rewards discipline. The long game is paying off now.', love: 'Loyalty and stability attract the right people to you.', career: 'Authority figures notice your dedication. Use this moment.' },
  Aquarius:    { focus: 'Uranus brings electric breakthroughs. Expect the unexpected.', love: 'Intellectual connection is as important as physical today.', career: 'Innovation sets you apart. Think outside every box.' },
  Pisces:      { focus: 'Neptune deepens your intuition. Dreams carry important messages.', love: 'Compassion and empathy make you irresistible right now.', career: 'Creative and spiritual work flourishes. Follow inspiration.' },
}

const HOW_STEPS = [
  { icon: Star,     title: 'Choose Your Sign',  desc: 'Select your Sun sign or enter your birth date for a more personalised reading.' },
  { icon: Sparkles, title: 'AI Reads the Stars', desc: 'Our AI analyses planetary positions, transits, and aspects aligned with your chart.' },
  { icon: Sun,      title: 'Navigate Your Day',  desc: 'Receive actionable, personalised guidance for love, career, and personal growth.' },
]

export default function HoroscopePage() {
  const [selected, setSelected] = useState<string | null>(null)
  const reading = selected ? PREVIEW_READINGS[selected] : null

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(6,182,212,0.08)_0%,transparent_65%)] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 80 }, (_, i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${(i*73+17)%100}%`, top: `${(i*47+11)%100}%`, width: `${0.5+(i%5)*0.35}px`, height: `${0.5+(i%5)*0.35}px`, opacity: (0.1+(i%6)*0.07).toFixed(2), animation: `twinkle ${2+(i%4)*0.8}s ${(i*0.37)%6}s ease-in-out infinite` }} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="relative max-w-2xl mx-auto"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/8 text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-5">
            Daily Cosmic Guidance
          </span>
          <h1 className="font-mystical text-[clamp(2.5rem,7vw,4.5rem)] font-bold text-white leading-tight mb-5">
            Your Daily{' '}
            <span className="text-gradient-cyan">Horoscope</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Not just your Sun sign — {BRAND_NAME} reads planetary transits, your rising sign, and current cosmic weather to deliver guidance that is uniquely yours.
          </p>

          {/* Floating sign images */}
          <div className="flex items-center justify-center gap-3 flex-wrap max-w-sm mx-auto opacity-60">
            {['aries','leo','sagittarius','taurus','virgo','capricorn'].map((s, i) => (
              <motion.div
                key={s}
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3 + i * 0.4, delay: i * 0.3 }}
              >
                <Image src={`/assets/zodiac/${s}.png`} alt={s} width={40} height={40} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15 } } }}
          >
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } } }}
                className="glass-card rounded-2xl p-7 text-center relative overflow-hidden group hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center mx-auto mb-4 group-hover:bg-cyan-500/25 transition-colors">
                  <step.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-2">Step {i + 1}</div>
                <h3 className="font-display font-bold text-white text-lg mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Sign picker + preview ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="font-mystical text-3xl sm:text-4xl font-bold text-white mb-3">
              Preview Your Reading
            </h2>
            <p className="text-slate-400">Select your sign to see a sample daily horoscope powered by {BRAND_NAME}.</p>
          </motion.div>

          {/* Sign grid */}
          <motion.div
            className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-8"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {SIGNS.map((sign) => (
              <motion.button
                key={sign.name}
                variants={{ hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' as const } } }}
                onClick={() => setSelected(sign.name === selected ? null : sign.name)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                  selected === sign.name
                    ? 'border-cyan-400/50 bg-cyan-400/10'
                    : 'border-white/6 bg-midnight-800/40 hover:border-white/15'
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Image src={`/assets/zodiac/${sign.file}.png`} alt={sign.name} width={36} height={36} />
                <span className="text-[10px] text-slate-400 font-medium">{sign.name}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* Reading preview */}
          <AnimatePresence mode="wait">
            {reading && (
              <motion.div
                key={selected}
                className="glass-card rounded-2xl p-8 relative overflow-hidden"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(6,182,212,0.06)_0%,transparent_60%)] pointer-events-none" />

                <div className="flex items-center gap-3 mb-6">
                  <Image src={`/assets/zodiac/${SIGNS.find(s => s.name === selected)?.file}.png`} alt={selected!} width={48} height={48} />
                  <div>
                    <h3 className="font-mystical text-2xl font-bold text-white">{selected}</h3>
                    <p className="text-cyan-400 text-xs font-semibold tracking-wider uppercase">Today&apos;s Reading · Preview</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { icon: Sparkles, label: 'Overall Focus', text: reading.focus, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                    { icon: Moon,     label: 'Love & Relationships', text: reading.love, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    { icon: Zap,      label: 'Career & Action', text: reading.career, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  ].map(({ icon: Icon, label, text, color, bg }) => (
                    <div key={label} className={`${bg} rounded-xl p-4 border border-white/5`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-slate-500 text-xs">This is a preview — the full reading includes 8 more sections.</p>
                  <Link href="/today">
                    <motion.button
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-linear-to-r from-cyan-500 to-teal-400 text-[#060D1B] font-bold text-sm"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Full Reading <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="py-16 px-6 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="font-mystical text-3xl font-bold text-white mb-8">Every Reading Includes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['Daily Focus', 'Love Guidance', 'Career Insights', 'Lucky Numbers', 'Moon Energy', 'Planetary Transits', 'Do\'s & Don\'ts', 'Tarot Card', 'Alternative Reading'].map((item) => (
                <div key={item} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-midnight-800/50 border border-white/6 text-left">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  <span className="text-slate-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <Link href="/today" className="inline-block mt-8">
              <motion.button
                className="px-8 py-4 rounded-full bg-linear-to-r from-cyan-500 to-teal-400 text-[#060D1B] font-bold text-base shadow-lg shadow-cyan-500/20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                Open Full Horoscope
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}

