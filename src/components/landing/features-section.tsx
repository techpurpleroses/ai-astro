'use client'

import { motion, type Variants } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    id: 'horoscope',
    title: 'Daily Horoscope',
    desc: 'Personalized daily guidance aligned with your birth chart and current planetary transits.',
    image: '/features/horoscope.png',
    href: '/horoscope',
    accentClass: 'group-hover:border-cyan-500/50 group-hover:shadow-cyan-500/10',
    gradientClass: 'from-cyan-500/15 to-teal-500/5',
    badge: 'Free',
    badgeClass: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    id: 'birth-chart',
    title: 'Birth Chart',
    desc: 'Your complete cosmic blueprint — planets, houses, aspects, and their precise meanings.',
    image: '/features/birth-chart.png',
    href: '/natal-chart',
    accentClass: 'group-hover:border-violet-500/50 group-hover:shadow-violet-500/10',
    gradientClass: 'from-violet-500/15 to-purple-500/5',
    badge: 'PRO',
    badgeClass: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'compatibility',
    title: 'Love Compatibility',
    desc: 'Discover your romantic chemistry with any zodiac sign. 505+ detailed compatibility reports.',
    image: '/features/compatibility.png',
    href: '/compatibility',
    accentClass: 'group-hover:border-rose-500/50 group-hover:shadow-rose-500/10',
    gradientClass: 'from-rose-500/15 to-pink-500/5',
    badge: 'PRO',
    badgeClass: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'tarot',
    title: 'Tarot Readings',
    desc: 'Ancient wisdom meets AI. Love, career & life spreads with rich, nuanced interpretations.',
    image: '/features/tarot-cards.webp',
    href: '/features/tarot',
    accentClass: 'group-hover:border-amber-500/50 group-hover:shadow-amber-500/10',
    gradientClass: 'from-amber-500/15 to-orange-500/5',
    badge: 'Popular',
    badgeClass: 'bg-orange-500/20 text-orange-400',
  },
  {
    id: 'moon',
    title: 'Moon Phases',
    desc: 'Align rituals and decisions with lunar cycles. From new moon intentions to full moon releases.',
    image: '/features/moon.png',
    href: '/today',
    accentClass: 'group-hover:border-slate-400/50 group-hover:shadow-slate-400/10',
    gradientClass: 'from-slate-400/10 to-blue-500/5',
    badge: 'Free',
    badgeClass: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    id: 'palm',
    title: 'Palm Reading',
    desc: 'AI-powered analysis of your palm lines. Heart, Head, Life, and Fate — all decoded.',
    image: '/features/horoscope.png',
    href: '/palm',
    accentClass: 'group-hover:border-teal-500/50 group-hover:shadow-teal-500/10',
    gradientClass: 'from-teal-500/15 to-emerald-500/5',
    badge: 'New',
    badgeClass: 'bg-teal-500/20 text-teal-400',
  },
]

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 56 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
}

const headingVariants: Variants = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 px-6 bg-midnight-950">
      {/* Top-edge glow */}
      <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-cyan-500/20 to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          className="text-center mb-16"
          variants={headingVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
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
        </motion.div>

        {/* Cards grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {FEATURES.map((feat) => (
            <Link href={feat.href} key={feat.id}>
              <motion.article
                variants={cardVariants}
                className={`group relative flex flex-col rounded-2xl overflow-hidden border border-white/6 bg-midnight-800/60 backdrop-blur-sm cursor-pointer h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${feat.accentClass}`}
              >
                {/* Hover gradient overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feat.gradientClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                {/* Shine layer */}
                <div className="absolute inset-0 bg-linear-to-br from-white/[0.03] to-transparent pointer-events-none" />

                {/* Feature image */}
                <div className="relative h-44 overflow-hidden shrink-0">
                  <Image
                    src={feat.image}
                    alt={feat.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight-800/95 via-midnight-800/30 to-transparent" />
                  <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold ${feat.badgeClass}`}>
                    {feat.badge}
                  </span>
                </div>

                {/* Text */}
                <div className="relative flex flex-col flex-1 p-5">
                  <h3 className="font-display font-bold text-lg text-white mb-2 group-hover:text-cyan-300 transition-colors duration-200">
                    {feat.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed flex-1">
                    {feat.desc}
                  </p>
                  <div className="flex items-center gap-1.5 text-cyan-400 text-sm font-medium mt-4">
                    <span>Explore</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200" />
                  </div>
                </div>
              </motion.article>
            </Link>
          ))}
        </motion.div>
      </div>

      {/* Bottom-edge glow */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/15 to-transparent" />
    </section>
  )
}
