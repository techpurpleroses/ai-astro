'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BRAND_NAME } from '@/lib/brand'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sun, Moon, Compass, Globe, Star, Zap } from 'lucide-react'

const BIG_THREE = [
  {
    icon: Sun,
    name: 'Sun Sign',
    sub: 'Your Core Identity',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    desc: 'The sign the Sun occupied at your birth. It represents your ego, vitality, and the essential self you are becoming throughout this lifetime.',
  },
  {
    icon: Moon,
    name: 'Moon Sign',
    sub: 'Your Emotional World',
    color: 'text-slate-300',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/25',
    desc: 'The sign the Moon was in when you were born. It governs your emotions, instincts, subconscious patterns, and what makes you feel safe and nourished.',
  },
  {
    icon: Compass,
    name: 'Rising Sign',
    sub: 'Your Outer Mask',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
    desc: 'The zodiac sign rising on the eastern horizon at your exact birth moment. It shapes your physical appearance, first impressions, and how the world perceives you.',
  },
]

const PLANETS = [
  { name: 'Mercury', rules: 'Communication', color: 'text-yellow-400' },
  { name: 'Venus',   rules: 'Love & Beauty',  color: 'text-rose-400' },
  { name: 'Mars',    rules: 'Drive & Action', color: 'text-red-400' },
  { name: 'Jupiter', rules: 'Luck & Growth',  color: 'text-amber-400' },
  { name: 'Saturn',  rules: 'Discipline',     color: 'text-slate-300' },
  { name: 'Uranus',  rules: 'Innovation',     color: 'text-sky-400' },
  { name: 'Neptune', rules: 'Spirituality',   color: 'text-violet-400' },
  { name: 'Pluto',   rules: 'Transformation', color: 'text-fuchsia-400' },
]

const HOUSES = [
  { n: 1,  name: 'Self & Appearance' }, { n: 2,  name: 'Money & Values' },
  { n: 3,  name: 'Communication' },     { n: 4,  name: 'Home & Family' },
  { n: 5,  name: 'Creativity & Love' }, { n: 6,  name: 'Health & Work' },
  { n: 7,  name: 'Partnership' },       { n: 8,  name: 'Transformation' },
  { n: 9,  name: 'Philosophy' },        { n: 10, name: 'Career & Status' },
  { n: 11, name: 'Friends & Goals' },   { n: 12, name: 'Hidden & Past' },
]

const TABS = ['Big Three', 'Planets', 'Houses'] as const
type Tab = typeof TABS[number]

function cardAnim(i: number) {
  return {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const },
  }
}

export default function NatalChartPage() {
  const [tab, setTab] = useState<Tab>('Big Three')

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(167,139,250,0.1)_0%,transparent_65%)] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 80 }, (_, i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${(i*73+17)%100}%`, top: `${(i*47+11)%100}%`, width: `${0.5+(i%5)*0.35}px`, height: `${0.5+(i%5)*0.35}px`, opacity: (0.1+(i%6)*0.07).toFixed(2), animation: `twinkle ${2+(i%4)*0.8}s ${(i*0.37)%6}s ease-in-out infinite` }} />
          ))}
        </div>

        {/* Floating planet orbs */}
        {[
          { size: 80,  top: '15%', left: '8%',  color: 'rgba(245,158,11,0.15)',  dur: 6 },
          { size: 50,  top: '60%', right: '6%', color: 'rgba(167,139,250,0.15)', dur: 8 },
          { size: 60,  top: '25%', right: '12%',color: 'rgba(6,182,212,0.12)',   dur: 7 },
        ].map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none hidden lg:block"
            style={{ width: orb.size, height: orb.size, top: orb.top, left: 'left' in orb ? orb.left : undefined, right: 'right' in orb ? orb.right : undefined, background: `radial-gradient(circle, ${orb.color}, transparent)`, filter: 'blur(2px)' }}
            animate={{ y: [-10, 10, -10] }}
            transition={{ repeat: Infinity, duration: orb.dur, ease: 'easeInOut', delay: i * 1.2 }}
          />
        ))}

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="relative max-w-2xl mx-auto"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-violet-400/20 bg-violet-400/8 text-violet-400 text-xs font-semibold tracking-widest uppercase mb-5">
            Your Cosmic Blueprint
          </span>
          <h1 className="font-mystical text-[clamp(2.5rem,7vw,4.5rem)] font-bold text-white leading-tight mb-5">
            Birth Chart{' '}
            <span className="text-gradient-cyan">Decoded</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            A birth chart is a snapshot of the sky at the exact moment you were born. It reveals your personality, gifts, challenges, and the cosmic forces shaping your life.
          </p>
        </motion.div>
      </section>

      {/* ── Tab section ── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="flex items-center justify-center mb-10">
            <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-midnight-800/60 border border-white/6">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                    tab === t ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab === t && (
                    <motion.div
                      layoutId="chart-tab"
                      className="absolute inset-0 rounded-xl bg-midnight-700 border border-white/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            {tab === 'Big Three' && (
              <motion.div
                key="big-three"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {BIG_THREE.map((item, i) => (
                  <motion.div
                    key={item.name}
                    {...cardAnim(i)}
                    className={`glass-card rounded-2xl p-7 border ${item.border} group hover:-translate-y-1 transition-transform duration-200`}
                  >
                    <div className={`w-14 h-14 rounded-2xl ${item.bg} border ${item.border} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <h3 className="font-mystical text-xl font-bold text-white mb-1">{item.name}</h3>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${item.color}`}>{item.sub}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {tab === 'Planets' && (
              <motion.div
                key="planets"
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {PLANETS.map((p, i) => (
                  <motion.div
                    key={p.name}
                    {...cardAnim(i)}
                    className="glass-card rounded-xl p-5 text-center group hover:-translate-y-1 transition-transform duration-200"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 group-hover:border-white/20 transition-colors">
                      <Globe className={`w-4 h-4 ${p.color}`} />
                    </div>
                    <p className="font-display font-bold text-white text-sm">{p.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{p.rules}</p>
                  </motion.div>
                ))}
                <motion.div
                  {...cardAnim(8)}
                  className="glass-card rounded-xl p-5 text-center col-span-2 sm:col-span-4"
                >
                  <p className="text-slate-400 text-sm">Each planet in your birth chart sits in a specific zodiac sign and house, creating a unique map of your personality, gifts, and life themes.</p>
                </motion.div>
              </motion.div>
            )}

            {tab === 'Houses' && (
              <motion.div
                key="houses"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {HOUSES.map((h, i) => (
                  <motion.div
                    key={h.n}
                    {...cardAnim(i)}
                    className="glass-card rounded-xl p-4 group hover:-translate-y-1 transition-transform duration-200"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mystical text-lg font-bold text-cyan-400">{h.n}</span>
                      <div className="h-px flex-1 bg-cyan-400/10" />
                    </div>
                    <p className="text-white text-sm font-medium">{h.name}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="font-mystical text-3xl sm:text-4xl font-bold text-white text-center mb-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            Your {BRAND_NAME} Birth Chart Includes
          </motion.h2>
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          >
            {[
              { icon: Sun,     title: 'Big Three Analysis', desc: 'Deep dive into Sun, Moon & Rising with personalised interpretations.' },
              { icon: Globe,   title: 'All 10 Planets',     desc: 'Each planet\'s sign, house position, and meaning for your life.' },
              { icon: Star,    title: '12 House Themes',    desc: 'What each life area — career, love, money — looks like for you.' },
              { icon: Zap,     title: 'Aspects & Patterns', desc: 'Trines, squares, conjunctions and their influence on your character.' },
              { icon: Moon,    title: 'Daily Transits',     desc: 'How today\'s planetary movements interact with your natal chart.' },
              { icon: Compass, title: 'Stellium Detection', desc: 'Identify powerful planet clusters revealing your core strengths.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="glass-card rounded-2xl p-6 group hover:-translate-y-1 transition-transform duration-200"
              >
                <item.icon className="w-5 h-5 text-violet-400 mb-3" />
                <h3 className="font-display font-bold text-white mb-1">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-24 text-center">
        <motion.div
          className="max-w-xl mx-auto glass-card rounded-3xl p-10"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-mystical text-3xl font-bold text-white mb-3">Reveal Your Chart</h2>
          <p className="text-slate-400 mb-7">All you need is your date, time, and place of birth. {BRAND_NAME} does the rest.</p>
          <Link href="/birth-chart">
            <motion.button
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-linear-to-r from-violet-500 to-cyan-500 text-white font-bold text-base shadow-lg shadow-violet-500/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              Generate My Birth Chart <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </section>
    </>
  )
}
