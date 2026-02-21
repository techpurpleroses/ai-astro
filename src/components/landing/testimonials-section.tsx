'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const TESTIMONIALS = [
  {
    name: 'Maya R.',
    sign: 'Scorpio',
    file: 'scorpio',
    rating: 5,
    text: 'The birth chart reading was eerily accurate — it described my personality, fears, and strengths better than I could myself. I\'ve tried other apps, but AstroAI is on another level.',
  },
  {
    name: 'James K.',
    sign: 'Aquarius',
    file: 'aquarius',
    rating: 5,
    text: 'I open AstroAI every morning. The daily horoscope feels genuinely personal, not generic copy-paste. It\'s like having a cosmic advisor in my pocket.',
  },
  {
    name: 'Sofia L.',
    sign: 'Pisces',
    file: 'pisces',
    rating: 5,
    text: 'My love compatibility report with my partner was spot on. I finally understand our dynamic and how to grow together. We both use it now.',
  },
  {
    name: 'Alex T.',
    sign: 'Leo',
    file: 'leo',
    rating: 5,
    text: 'The tarot readings are incredibly thoughtful. I pull a card every day now, and the interpretations are always relevant to what I\'m facing.',
  },
  {
    name: 'Priya N.',
    sign: 'Virgo',
    file: 'virgo',
    rating: 5,
    text: 'As someone who studies astrology seriously, I\'m genuinely impressed. The planet interpretations are nuanced and accurate. This is not beginner-level stuff.',
  },
  {
    name: 'Marco B.',
    sign: 'Sagittarius',
    file: 'sagittarius',
    rating: 5,
    text: 'The moon phase guidance transformed my routines. I now plan big decisions around lunar cycles and the results have been remarkable.',
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < count ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
        />
      ))}
    </div>
  )
}

export function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(1)

  const go = (next: number) => {
    setDirection(next > active ? 1 : -1)
    setActive((next + TESTIMONIALS.length) % TESTIMONIALS.length)
  }

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1)
      setActive((a) => (a + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.testi-heading', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.testi-heading', start: 'top 88%' },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0, scale: 0.97 }),
  }

  const t = TESTIMONIALS[active]

  return (
    <section
      id="reviews"
      ref={sectionRef}
      className="relative py-28 px-6 bg-midnight-950 overflow-hidden"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(6,182,212,0.04)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Floating stars decorative */}
      {[
        { x: '10%', y: '20%', s: 80, op: 0.07 },
        { x: '85%', y: '15%', s: 60, op: 0.05 },
        { x: '5%', y: '75%', s: 50, op: 0.06 },
        { x: '90%', y: '70%', s: 70, op: 0.07 },
      ].map((d, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{ left: d.x, top: d.y, opacity: d.op }}
        >
          <Image src="/decorative/stars.png" alt="" width={d.s} height={d.s} />
        </div>
      ))}

      <div className="max-w-3xl mx-auto">
        {/* Heading */}
        <div className="testi-heading text-center mb-14">
          <span className="inline-block px-3 py-1 rounded-full border border-amber-400/20 bg-amber-400/8 text-amber-400 text-xs font-semibold tracking-widest uppercase mb-4">
            What People Say
          </span>
          <h2 className="font-mystical text-[clamp(2rem,5vw,3.5rem)] font-bold text-white leading-tight">
            Loved by{' '}
            <span className="text-gradient-gold">500K+ Seekers</span>
          </h2>
        </div>

        {/* Main testimonial card */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={active}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="glass-card rounded-3xl p-8 sm:p-10 relative overflow-hidden"
            >
              {/* Card shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none rounded-3xl" />

              {/* Quote icon */}
              <Quote className="w-10 h-10 text-cyan-500/25 mb-6" />

              {/* Stars */}
              <StarRating count={t.rating} />

              {/* Quote text */}
              <p className="text-white/90 text-lg sm:text-xl leading-relaxed mt-5 mb-8 font-light">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* User */}
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-midnight-800 shrink-0">
                  <Image
                    src={`/zodiac/${t.file}.png`}
                    alt={t.sign}
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
                <div>
                  <p className="text-white font-semibold">{t.name}</p>
                  <p className="text-slate-400 text-sm">{t.sign} ✦ Verified User</p>
                </div>

                {/* Zodiac sign */}
                <div className="ml-auto text-right">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">{active + 1} / {TESTIMONIALS.length}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => go(active - 1)}
              className="w-10 h-10 rounded-full border border-white/10 bg-midnight-800/60 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-500/40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className="transition-all duration-300"
                >
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === active ? 'w-6 bg-cyan-400' : 'w-1.5 bg-white/20'
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              onClick={() => go(active + 1)}
              className="w-10 h-10 rounded-full border border-white/10 bg-midnight-800/60 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-500/40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <motion.div
          className="grid grid-cols-3 gap-6 mt-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {[
            { n: '1M+', label: 'Readings Delivered', color: 'text-cyan-400' },
            { n: '4.9', label: 'Average Rating', color: 'text-amber-400', sub: '★' },
            { n: '98%', label: 'Satisfaction Rate', color: 'text-emerald-400' },
          ].map(({ n, label, color, sub }) => (
            <div key={label} className="text-center">
              <p className={`font-mystical text-3xl sm:text-4xl font-bold ${color}`}>
                {n}{sub}
              </p>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent" />
    </section>
  )
}
