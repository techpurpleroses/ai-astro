'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Flame, Mountain, Wind, Droplets } from 'lucide-react'

const ELEMENT_META = {
  Fire:  { icon: Flame,    color: 'text-orange-400', ring: 'ring-orange-400/50',  bg: 'bg-orange-500/10',  border: 'border-orange-500/25',  label: 'bg-orange-500/15 text-orange-300' },
  Earth: { icon: Mountain, color: 'text-emerald-400', ring: 'ring-emerald-400/50', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', label: 'bg-emerald-500/15 text-emerald-300' },
  Air:   { icon: Wind,     color: 'text-sky-400',     ring: 'ring-sky-400/50',     bg: 'bg-sky-500/10',     border: 'border-sky-500/25',     label: 'bg-sky-500/15 text-sky-300' },
  Water: { icon: Droplets, color: 'text-cyan-400',    ring: 'ring-cyan-400/50',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25',    label: 'bg-cyan-500/15 text-cyan-300' },
} as const

type Element = keyof typeof ELEMENT_META

const ZODIAC = [
  { name: 'Aries',       file: 'aries',       symbol: '♈', element: 'Fire'  as Element, ruling: 'Mars',    dates: 'Mar 21 – Apr 19', traits: ['Bold', 'Pioneering', 'Courageous'], desc: 'The fearless trailblazer of the zodiac. Aries charges headfirst into new territory with infectious enthusiasm and raw energy.' },
  { name: 'Taurus',      file: 'taurus',      symbol: '♉', element: 'Earth' as Element, ruling: 'Venus',   dates: 'Apr 20 – May 20', traits: ['Patient', 'Sensual', 'Reliable'],   desc: 'Grounded in the pleasures of the world, Taurus builds beauty and stability with unwavering patience and devotion.' },
  { name: 'Gemini',      file: 'gemini',      symbol: '♊', element: 'Air'   as Element, ruling: 'Mercury', dates: 'May 21 – Jun 20', traits: ['Curious', 'Witty', 'Adaptable'],    desc: 'The celestial twins embody duality — endlessly curious, brilliantly communicative, and always surprising.' },
  { name: 'Cancer',      file: 'cancer',      symbol: '♋', element: 'Water' as Element, ruling: 'Moon',    dates: 'Jun 21 – Jul 22', traits: ['Nurturing', 'Intuitive', 'Loyal'],  desc: 'Deeply feeling and fiercely protective, Cancer creates safe havens from the waves of emotion that guide their soul.' },
  { name: 'Leo',         file: 'leo',         symbol: '♌', element: 'Fire'  as Element, ruling: 'Sun',     dates: 'Jul 23 – Aug 22', traits: ['Charismatic', 'Creative', 'Warm'],  desc: 'Radiant as the sun that rules them, Leo lights up every room with magnetic presence and a generous, royal heart.' },
  { name: 'Virgo',       file: 'virgo',       symbol: '♍', element: 'Earth' as Element, ruling: 'Mercury', dates: 'Aug 23 – Sep 22', traits: ['Analytical', 'Precise', 'Helpful'], desc: 'Virgo weaves order from chaos with an eagle eye for detail and an earnest desire to be of genuine service to others.' },
  { name: 'Libra',       file: 'libra',       symbol: '♎', element: 'Air'   as Element, ruling: 'Venus',   dates: 'Sep 23 – Oct 22', traits: ['Diplomatic', 'Charming', 'Fair'],   desc: 'The cosmic scales seeker — Libra pursues beauty, balance, and harmony in all things with effortless grace.' },
  { name: 'Scorpio',     file: 'scorpio',     symbol: '♏', element: 'Water' as Element, ruling: 'Pluto',   dates: 'Oct 23 – Nov 21', traits: ['Intense', 'Magnetic', 'Perceptive'], desc: 'Scorpio dives into the depths no other sign dares to touch, emerging transformed, powerful, and profoundly wise.' },
  { name: 'Sagittarius', file: 'sagittarius', symbol: '♐', element: 'Fire'  as Element, ruling: 'Jupiter', dates: 'Nov 22 – Dec 21', traits: ['Adventurous', 'Optimistic', 'Free'], desc: 'The cosmic archer aims at the horizon of truth and adventure, forever expanding their world with joyful abandon.' },
  { name: 'Capricorn',   file: 'capricorn',   symbol: '♑', element: 'Earth' as Element, ruling: 'Saturn',  dates: 'Dec 22 – Jan 19', traits: ['Ambitious', 'Disciplined', 'Wise'],  desc: 'The mountain goat climbs impossible peaks with steady determination — Capricorn embodies mastery through effort.' },
  { name: 'Aquarius',    file: 'aquarius',    symbol: '♒', element: 'Air'   as Element, ruling: 'Uranus',  dates: 'Jan 20 – Feb 18', traits: ['Innovative', 'Visionary', 'Free'],  desc: 'The water bearer pours future-shaping ideas onto humanity, a cosmic rebel who lives decades ahead of their time.' },
  { name: 'Pisces',      file: 'pisces',      symbol: '♓', element: 'Water' as Element, ruling: 'Neptune', dates: 'Feb 19 – Mar 20', traits: ['Dreamy', 'Empathetic', 'Artistic'],  desc: 'Pisces swims between worlds — the most spiritual and empathic of all signs, channeling cosmic love through art and intuition.' },
]

type FilterKey = 'All' | Element
const FILTERS: FilterKey[] = ['All', 'Fire', 'Earth', 'Air', 'Water']

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.55, ease: 'easeOut' as const } },
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

export default function ZodiacPage() {
  const [filter, setFilter] = useState<FilterKey>('All')
  const [hovered, setHovered] = useState<string | null>(null)

  const visible = filter === 'All' ? ZODIAC : ZODIAC.filter((s) => s.element === filter)

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(167,139,250,0.1)_0%,transparent_65%)] pointer-events-none" />
        {/* Star field */}
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
          <span className="inline-block px-3 py-1 rounded-full border border-violet-400/20 bg-violet-400/8 text-violet-400 text-xs font-semibold tracking-widest uppercase mb-5">
            Ancient Archetypes
          </span>
          <h1 className="font-mystical text-[clamp(2.5rem,7vw,4.5rem)] font-bold text-white leading-tight mb-5">
            The Twelve Signs of the{' '}
            <span className="text-gradient-cyan">Zodiac</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Each sign is a unique cosmic archetype — a lens through which the universe expresses itself. Find yours and unlock your celestial story.
          </p>
        </motion.div>
      </section>

      {/* ── Element filter ── */}
      <section className="px-6 pb-6">
        <motion.div
          className="max-w-lg mx-auto flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-midnight-800/50 border border-white/6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {FILTERS.map((f) => {
            const meta = f !== 'All' ? ELEMENT_META[f] : null
            const Icon = meta?.icon
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  filter === f
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {filter === f && (
                  <motion.div
                    layoutId="filter-bg"
                    className="absolute inset-0 rounded-xl bg-midnight-700 border border-white/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {Icon && <Icon className={`w-3.5 h-3.5 relative z-10 ${meta?.color}`} />}
                <span className="relative z-10">{f}</span>
              </button>
            )
          })}
        </motion.div>
      </section>

      {/* ── Zodiac grid ── */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {visible.map((sign) => {
                const meta = ELEMENT_META[sign.element]
                const isHovered = hovered === sign.name
                return (
                  <motion.div
                    key={sign.name}
                    variants={cardVariants}
                    onHoverStart={() => setHovered(sign.name)}
                    onHoverEnd={() => setHovered(null)}
                    className={`group relative rounded-2xl border ${meta.border} bg-midnight-800/50 backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl`}
                    style={{ boxShadow: isHovered ? `0 20px 40px rgba(0,0,0,0.4)` : undefined }}
                  >
                    {/* Gradient bg */}
                    <div className={`absolute inset-0 ${meta.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                    <div className="relative p-6 flex flex-col items-center text-center gap-4">
                      {/* Symbol */}
                      <div className="text-3xl font-mystical opacity-20 absolute top-3 right-4">{sign.symbol}</div>

                      {/* Image */}
                      <motion.div
                        className={`w-20 h-20 rounded-full ring-2 ring-transparent ${isHovered ? meta.ring : ''} transition-all duration-300 overflow-hidden bg-midnight-900/50`}
                        animate={{ scale: isHovered ? 1.08 : 1 }}
                        transition={{ duration: 0.25 }}
                      >
                        <Image src={`/zodiac/${sign.file}.png`} alt={sign.name} width={80} height={80} className="object-contain p-2" />
                      </motion.div>

                      {/* Name + dates */}
                      <div>
                        <h3 className={`font-mystical text-xl font-bold transition-colors duration-200 ${isHovered ? 'text-white' : 'text-slate-200'}`}>{sign.name}</h3>
                        <p className="text-slate-500 text-xs mt-0.5">{sign.dates}</p>
                      </div>

                      {/* Element + ruling */}
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${meta.label}`}>{sign.element}</span>
                        <span className="text-slate-600 text-[11px]">☽ {sign.ruling}</span>
                      </div>

                      {/* Traits */}
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {sign.traits.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 text-slate-400 text-[11px] border border-white/6">{t}</span>
                        ))}
                      </div>

                      {/* Description — revealed on hover */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.p
                            className="text-slate-300 text-xs leading-relaxed"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            {sign.desc}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      {/* CTA */}
                      <Link href="/today" className="mt-auto">
                        <motion.span
                          className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                          animate={{ x: isHovered ? 2 : 0 }}
                        >
                          Read horoscope <ArrowRight className="w-3 h-3" />
                        </motion.span>
                      </Link>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>
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
          <h2 className="font-mystical text-3xl font-bold text-white mb-3">Know Your Sign?</h2>
          <p className="text-slate-400 mb-7">Get your personalized daily horoscope, birth chart, and cosmic guidance — all powered by AI.</p>
          <Link href="/today">
            <motion.button
              className="px-8 py-4 rounded-full bg-linear-to-r from-cyan-500 to-teal-400 text-[#060D1B] font-bold text-base shadow-lg shadow-cyan-500/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              Start Free Reading
            </motion.button>
          </Link>
        </motion.div>
      </section>
    </>
  )
}
