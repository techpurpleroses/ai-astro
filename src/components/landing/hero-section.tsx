'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const EASE_SMOOTH = [0.25, 0.46, 0.45, 0.94] as const

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: EASE_SMOOTH },
  }
}

/* ─── Static star data (deterministic, avoids hydration mismatch) ─── */
const STARS = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  x: ((i * 73 + 17) % 100).toFixed(2),
  y: ((i * 47 + 11) % 100).toFixed(2),
  size: 0.5 + (i % 6) * 0.35,
  delay: ((i * 0.37) % 7).toFixed(2),
  dur: (2.2 + (i % 4) * 0.9).toFixed(1),
  op: (0.15 + (i % 7) * 0.12).toFixed(2),
}))

/* ─── Zodiac orbit data ─── */
const ZODIAC = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces',
]

const ORBIT_R = 46 // % of container half-width

const signPositions = ZODIAC.map((sign, i) => {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
  return {
    sign,
    x: 50 + ORBIT_R * Math.cos(angle),
    y: 50 + ORBIT_R * Math.sin(angle),
  }
})


export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const orbitRef = useRef<HTMLDivElement>(null)
  const moonRef = useRef<HTMLDivElement>(null)
  const ring1Ref = useRef<SVGCircleElement>(null)

  const { scrollY } = useScroll()
  const orbitalY = useTransform(scrollY, [0, 700], [0, -120])
  const textOpacity = useTransform(scrollY, [0, 350], [1, 0])

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Orbital rotation */
      gsap.to(orbitRef.current, {
        rotation: 360,
        duration: 90,
        ease: 'none',
        repeat: -1,
        transformOrigin: '50% 50%',
      })

      /* Counter-rotate each icon so signs stay upright */
      gsap.to('.hero-orbit-icon', {
        rotation: -360,
        duration: 90,
        ease: 'none',
        repeat: -1,
        transformOrigin: '50% 50%',
      })

      /* Moon breathing glow */
      gsap.to(moonRef.current, {
        scale: 1.06,
        duration: 3.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        transformOrigin: 'center center',
      })

      /* Orbital ring dash animation */
      gsap.to(ring1Ref.current, {
        strokeDashoffset: -200,
        duration: 12,
        ease: 'none',
        repeat: -1,
      })

      /* Parallax on scroll */
      gsap.to('.hero-orbital-wrap', {
        yPercent: -18,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060D1B]"
    >
      {/* ── Deep space gradient layers ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.12)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_80%,rgba(167,139,250,0.07)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_20%_70%,rgba(20,184,166,0.06)_0%,transparent_55%)]" />

      {/* ── Star field ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STARS.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.op,
              animation: `twinkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Orbital orrery (centered, behind text) ── */}
      <motion.div
        className="hero-orbital-wrap absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ y: orbitalY }}
      >
        <div
          className="relative"
          style={{
            width: 'min(580px, 92vw)',
            height: 'min(580px, 92vw)',
          }}
        >
          {/* SVG orbital tracks */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 580 580"
          >
            <defs>
              <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#A78BFA" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Glow behind moon */}
            <circle cx="290" cy="290" r="110" fill="url(#moonGlow)" />

            {/* Inner orbit track */}
            <circle cx="290" cy="290" r="150" fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth="1" />
            {/* Middle orbit track */}
            <circle cx="290" cy="290" r="205" fill="none" stroke="rgba(6,182,212,0.06)" strokeWidth="1" />
            {/* Outer orbit track — dashed, animated */}
            <circle
              ref={ring1Ref}
              cx="290" cy="290" r="267"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="1.5"
              strokeDasharray="8 16"
              strokeDashoffset="0"
            />
            {/* Outer faint ring */}
            <circle cx="290" cy="290" r="275" fill="none" stroke="rgba(167,139,250,0.05)" strokeWidth="1" />
          </svg>

          {/* Rotating zodiac ring */}
          <div ref={orbitRef} className="absolute inset-0">
            {signPositions.map(({ sign, x, y }) => (
              <div
                key={sign}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 38,
                  height: 38,
                }}
              >
                <Image
                  src={`/zodiac/${sign}.png`}
                  alt={sign}
                  width={38}
                  height={38}
                  className="hero-orbit-icon opacity-50 hover:opacity-90 transition-opacity duration-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                />
              </div>
            ))}
          </div>

          {/* Central moon */}
          <div
            ref={moonRef}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full overflow-hidden"
            style={{ width: 172, height: 172, boxShadow: '0 0 60px 20px rgba(6,182,212,0.18), 0 0 120px 40px rgba(6,182,212,0.06)' }}
          >
            <Image
              src="/moon/moon-color.png"
              alt="Moon"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Floating mini-planets */}
          {[
            { size: 10, r: 150, angle: 45, color: '#F59E0B', dur: 18 },
            { size: 7,  r: 205, angle: 200, color: '#A78BFA', dur: 24 },
            { size: 5,  r: 150, angle: 280, color: '#14B8A6', dur: 20 },
          ].map((p, i) => {
            const a = (p.angle * Math.PI) / 180
            const cx = 50 + (p.r / 580) * 100 * Math.cos(a)
            const cy = 50 + (p.r / 580) * 100 * Math.sin(a)
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${cx}%`,
                  top: `${cy}%`,
                  transform: 'translate(-50%,-50%)',
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                  animation: `float-y ${p.dur}s ease-in-out infinite`,
                  animationDelay: `${i * 2}s`,
                }}
              />
            )
          })}
        </div>
      </motion.div>

      {/* ── Hero text content ── */}
      <motion.div
        className="relative z-10 text-center px-6 pt-24 pb-16 max-w-4xl mx-auto"
        style={{ opacity: textOpacity }}
      >
        {/* Pill badge */}
        <motion.div
          {...fadeUp(0.2)}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/8 text-cyan-400 text-xs font-semibold tracking-[0.18em] uppercase mb-7"
        >
          <Star className="w-3 h-3 fill-current" />
          AI-Powered Astrology
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.45)}
          className="font-mystical text-[clamp(2.5rem,8vw,5.5rem)] font-bold text-white leading-[1.06] tracking-tight mb-6"
        >
          Your Stars.
          <br />
          <span className="text-gradient-cyan">Your Story.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...fadeUp(0.65)}
          className="text-[clamp(1rem,2.5vw,1.25rem)] text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Personalized birth charts, daily horoscopes, tarot readings & cosmic
          guidance — all powered by AI. Discover what the universe holds for you.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.85)}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/today">
            <motion.button
              className="group flex items-center gap-2.5 px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 text-[#060D1B] font-bold text-base hover:shadow-2xl hover:shadow-cyan-500/30 transition-shadow"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.97 }}
            >
              Begin Your Journey
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
          <a href="#features">
            <motion.button
              className="px-8 py-4 rounded-full border border-white/15 text-white font-medium text-base hover:bg-white/8 transition-colors backdrop-blur-sm"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              Explore Features
            </motion.button>
          </a>
        </motion.div>

        {/* Trust line */}
        <motion.div
          {...fadeUp(1.05)}
          className="mt-10 flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm"
        >
          {[
            { n: '1M+', label: 'Readings' },
            { n: '500K+', label: 'Users' },
            { n: '4.9★', label: 'Rating' },
          ].map(({ n, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">{n}</span>
              <span>{label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Scroll indicator ── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
      >
        <div className="w-px h-14 bg-gradient-to-b from-transparent via-slate-600/50 to-transparent" />
        <span className="text-[10px] tracking-[0.25em] uppercase">Scroll</span>
      </motion.div>
    </section>
  )
}
