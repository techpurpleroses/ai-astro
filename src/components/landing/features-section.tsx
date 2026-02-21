'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const FEATURES = [
  {
    id: 'horoscope',
    title: 'Daily Horoscope',
    desc: 'Personalized daily guidance aligned with your unique birth chart and current planetary transits.',
    image: '/features/horoscope.png',
    href: '/today',
    gradient: 'from-cyan-500/20 to-teal-500/5',
    border: 'group-hover:border-cyan-500/50',
    glow: 'group-hover:shadow-cyan-500/15',
    badge: 'Free',
    badgeColor: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    id: 'birth-chart',
    title: 'Birth Chart',
    desc: 'Your complete cosmic blueprint — planets, houses, aspects, and their precise meanings for your life.',
    image: '/features/birth-chart.png',
    href: '/birth-chart',
    gradient: 'from-violet-500/20 to-purple-500/5',
    border: 'group-hover:border-violet-500/50',
    glow: 'group-hover:shadow-violet-500/15',
    badge: 'PRO',
    badgeColor: 'bg-gold-accent/20 text-gold-accent',
  },
  {
    id: 'compatibility',
    title: 'Love Compatibility',
    desc: 'Discover your romantic chemistry with any zodiac sign. 505+ detailed compatibility reports.',
    image: '/features/compatibility.png',
    href: '/compatibility',
    gradient: 'from-rose-500/20 to-pink-500/5',
    border: 'group-hover:border-rose-500/50',
    glow: 'group-hover:shadow-rose-500/15',
    badge: 'PRO',
    badgeColor: 'bg-gold-accent/20 text-gold-accent',
  },
  {
    id: 'tarot',
    title: 'Tarot Readings',
    desc: 'Ancient wisdom meets modern AI. Love, career, and life spreads — with rich interpretations.',
    image: '/features/tarot-cards.webp',
    href: '/features/tarot',
    gradient: 'from-amber-500/20 to-orange-500/5',
    border: 'group-hover:border-amber-500/50',
    glow: 'group-hover:shadow-amber-500/15',
    badge: 'Popular',
    badgeColor: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'moon',
    title: 'Moon Phases',
    desc: 'Align rituals and decisions with lunar cycles. From new moon intentions to full moon releases.',
    image: '/features/moon.png',
    href: '/today',
    gradient: 'from-slate-400/15 to-blue-500/5',
    border: 'group-hover:border-slate-400/50',
    glow: 'group-hover:shadow-slate-400/10',
    badge: 'Free',
    badgeColor: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    id: 'magic-ball',
    title: 'Cosmic 8-Ball',
    desc: 'Ask the universe anything. AI-powered mystical answers drawn from ancient astrological wisdom.',
    image: '/features/magic-ball.png',
    href: '/today',
    gradient: 'from-teal-500/20 to-emerald-500/5',
    border: 'group-hover:border-teal-500/50',
    glow: 'group-hover:shadow-teal-500/15',
    badge: 'Fun',
    badgeColor: 'bg-teal-500/20 text-teal-400',
  },
]

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Heading reveal */
      gsap.from('.feat-heading', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.feat-heading',
          start: 'top 88%',
        },
      })

      /* Card stagger */
      gsap.from('.feat-card', {
        y: 64,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.features-grid',
          start: 'top 82%',
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-28 px-6 bg-midnight-950"
    >
      {/* Subtle top-edge glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="feat-heading text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/8 text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-4">
            Everything You Need
          </span>
          <h2 className="font-mystical text-[clamp(2rem,5vw,3.5rem)] font-bold text-white leading-tight mb-4">
            Powered by the{' '}
            <span className="text-gradient-cyan">Cosmos</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
            Six powerful tools that decode your destiny, guide your decisions,
            and reveal the secrets written in the stars.
          </p>
        </div>

        {/* Cards grid */}
        <div className="features-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feat) => (
            <Link href={feat.href} key={feat.id}>
              <motion.div
                className={`feat-card group relative rounded-2xl overflow-hidden border border-white/6 bg-midnight-800/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${feat.glow} cursor-pointer h-full`}
                whileHover={{ borderColor: 'rgba(6,182,212,0.3)' }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Card shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

                {/* Image */}
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={feat.image}
                    alt={feat.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight-800/90 via-midnight-800/20 to-transparent" />

                  {/* Badge */}
                  <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold ${feat.badgeColor}`}>
                    {feat.badge}
                  </span>
                </div>

                {/* Content */}
                <div className="relative p-5">
                  <h3 className="font-display font-bold text-lg text-white mb-2 group-hover:text-cyan-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    {feat.desc}
                  </p>
                  <div className="flex items-center gap-1.5 text-cyan-400 text-sm font-medium">
                    <span>Explore</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom-edge glow */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent" />
    </section>
  )
}
