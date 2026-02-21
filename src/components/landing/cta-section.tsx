'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, ArrowRight, Star } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const FEATURE_PILLS = [
  'Daily Horoscope',
  'Birth Chart',
  'Love Compatibility',
  'Tarot Readings',
  'Moon Phases',
  'Palm Reading',
]

export function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const moonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Moon float */
      gsap.to(moonRef.current, {
        y: -20,
        duration: 4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })

      /* Content reveal */
      gsap.from('.cta-content > *', {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.cta-content', start: 'top 80%' },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6 overflow-hidden bg-[#060D1B]"
    >
      {/* Multi-layer cosmic background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(6,182,212,0.1)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_30%_0%,rgba(167,139,250,0.08)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_70%_10%,rgba(20,184,166,0.06)_0%,transparent_60%)]" />

      {/* Top divider */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      {/* Decorative stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 60 }, (_, i) => ({
          x: ((i * 97 + 13) % 100).toFixed(1),
          y: ((i * 61 + 7) % 100).toFixed(1),
          s: 0.5 + (i % 5) * 0.3,
          op: (0.1 + (i % 6) * 0.08).toFixed(2),
          delay: ((i * 0.41) % 5).toFixed(1),
        })).map((star, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.s}px`,
              height: `${star.s}px`,
              opacity: star.op,
              animation: `twinkle 3s ${star.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Floating moon image */}
      <div
        ref={moonRef}
        className="absolute right-[5%] top-[10%] opacity-15 pointer-events-none hidden lg:block"
      >
        <Image
          src="/moon/full-moon.webp"
          alt=""
          width={300}
          height={300}
          className="rounded-full"
          style={{ filter: 'blur(1px)' }}
        />
      </div>

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <div className="cta-content flex flex-col items-center gap-6">
          {/* Badge */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/8 text-cyan-400 text-xs font-semibold tracking-widest uppercase">
            <Sparkles className="w-3 h-3" />
            Start Free Today
          </div>

          {/* Headline */}
          <h2 className="font-mystical text-[clamp(2.2rem,6vw,4rem)] font-bold text-white leading-tight">
            Begin Your{' '}
            <span className="text-gradient-cyan">Cosmic Journey</span>
          </h2>

          {/* Subtitle */}
          <p className="text-slate-400 text-lg max-w-lg leading-relaxed">
            Join over 500,000 seekers who use AstroAI every day to navigate life with the wisdom of the stars.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-xl">
            {FEATURE_PILLS.map((pill) => (
              <span
                key={pill}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-midnight-800/60 border border-white/8 text-slate-300 text-xs"
              >
                <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                {pill}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <Link href="/today">
              <motion.button
                className="group flex items-center gap-2.5 px-10 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 text-[#060D1B] font-bold text-base hover:shadow-2xl hover:shadow-cyan-500/30 transition-shadow"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.97 }}
              >
                <Sparkles className="w-4 h-4" />
                Open AstroAI Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </div>

          {/* Trust micro-copy */}
          <p className="text-slate-600 text-xs">
            No account required · Free daily readings · Premium upgrade anytime
          </p>
        </div>
      </div>
    </section>
  )
}
