'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Heart, Brain, Activity, Navigation } from 'lucide-react'

const PALM_LINES = [
  {
    id: 'heart',
    name: 'Heart Line',
    subtitle: 'Emotions & Relationships',
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/25',
    glow: 'shadow-rose-500/20',
    image: '/palm/heart-line.jpg',
    description: 'Running horizontally across the upper palm, the Heart Line reveals the depth of your emotional world. Its length, curve, and markings speak to your capacity for love, the nature of your relationships, and how you experience emotional bonds.',
    insights: [
      { label: 'Long & curved', meaning: 'Passionate, expressive, wears heart on sleeve' },
      { label: 'Short & straight', meaning: 'Practical in love, values shared goals over grand gestures' },
      { label: 'Broken line', meaning: 'Emotional turbulence; significant relationship shifts' },
      { label: 'Double line', meaning: 'Protected by a strong emotional support system' },
    ],
  },
  {
    id: 'head',
    name: 'Head Line',
    subtitle: 'Intellect & Thinking Style',
    icon: Brain,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/25',
    glow: 'shadow-violet-500/20',
    image: '/palm/head-line.jpg',
    description: 'Crossing the centre of the palm, the Head Line maps your mind — how you think, communicate, and process information. It reveals whether you are logical or intuitive, focused or scattered, and your capacity for concentration and creative thought.',
    insights: [
      { label: 'Long & straight', meaning: 'Analytical, logical, structured thinker' },
      { label: 'Curved downward', meaning: 'Creative, imaginative, intuitive decision-making' },
      { label: 'Short line', meaning: 'Quick, decisive, favours action over overthinking' },
      { label: 'Forked end', meaning: 'The "writer\'s fork" — versatile, sees multiple perspectives' },
    ],
  },
  {
    id: 'life',
    name: 'Life Line',
    subtitle: 'Vitality & Life Journey',
    icon: Activity,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    glow: 'shadow-emerald-500/20',
    image: '/palm/life-line.jpg',
    description: 'Arcing around the base of the thumb, the Life Line does not predict how long you will live — but rather the quality, vitality, and major turning points of your life. Breaks, branches, and islands each tell a story of change, resilience, and renewal.',
    insights: [
      { label: 'Long & deep', meaning: 'Strong vitality, rich life experiences, robust health' },
      { label: 'Short or faint', meaning: 'Prefers routine; energy must be carefully managed' },
      { label: 'Broken line', meaning: 'Major life changes, relocations, or sudden transitions' },
      { label: 'Chained line', meaning: 'Period of health challenges requiring extra care' },
    ],
  },
  {
    id: 'fate',
    name: 'Fate Line',
    subtitle: 'Destiny & Career Path',
    icon: Navigation,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    glow: 'shadow-amber-500/20',
    image: '/palm/fate-line.jpg',
    description: 'Running vertically through the centre of the palm, the Fate Line speaks to your career, life purpose, and the degree to which you feel guided by destiny. Some people have very clear fate lines; others have none — both are equally meaningful.',
    insights: [
      { label: 'Deep & clear', meaning: 'Strong sense of purpose; life feels directed by fate' },
      { label: 'Absent', meaning: 'Creates your own path; life shaped entirely by free will' },
      { label: 'Starts from Life Line', meaning: 'Career built on personal effort and self-determination' },
      { label: 'Multiple lines', meaning: 'Several vocations or major career pivots throughout life' },
    ],
  },
]

function ParallaxSection({
  line,
  index,
}: {
  line: typeof PALM_LINES[0]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [40, -40])
  const isEven = index % 2 === 0

  return (
    <div ref={ref} className="py-16 lg:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-10 lg:gap-16`}>

          {/* Image */}
          <motion.div
            className="w-full lg:w-1/2 relative group"
            style={{ y }}
            initial={{ opacity: 0, x: isEven ? -40 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className={`relative rounded-2xl overflow-hidden border ${line.border} shadow-2xl ${line.glow}`}>
              <Image
                src={line.image}
                alt={line.name}
                width={600}
                height={400}
                className="w-full object-cover group-hover:scale-105 transition-transform duration-700"
                style={{ aspectRatio: '4/3' }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#060D1B]/70 via-transparent to-transparent" />
              {/* Glow overlay */}
              <div className={`absolute inset-0 ${line.bg} opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
            </div>
            {/* Decorative corner glow */}
            <div className={`absolute -inset-1 rounded-2xl ${line.bg} opacity-30 blur-xl -z-10 group-hover:opacity-60 transition-opacity duration-500`} />
          </motion.div>

          {/* Content */}
          <motion.div
            className="w-full lg:w-1/2"
            initial={{ opacity: 0, x: isEven ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          >
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${line.bg} border ${line.border} mb-5`}>
              <line.icon className={`w-4 h-4 ${line.color}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${line.color}`}>{line.subtitle}</span>
            </div>

            <h2 className="font-mystical text-4xl lg:text-5xl font-bold text-white mb-4">
              {line.name}
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-7">
              {line.description}
            </p>

            {/* Insights */}
            <div className="space-y-3">
              {line.insights.map((insight) => (
                <div key={insight.label} className={`flex gap-3 p-3.5 rounded-xl ${line.bg} border ${line.border}`}>
                  <div className={`shrink-0 w-1.5 rounded-full ${line.color.replace('text-', 'bg-')}`} />
                  <div>
                    <span className="text-white text-sm font-semibold">{insight.label}:</span>{' '}
                    <span className="text-slate-400 text-sm">{insight.meaning}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default function PalmPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(245,158,11,0.07)_0%,transparent_65%)] pointer-events-none" />
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
          <span className="inline-block px-3 py-1 rounded-full border border-amber-400/20 bg-amber-400/8 text-amber-400 text-xs font-semibold tracking-widest uppercase mb-5">
            Ancient Palm Wisdom
          </span>
          <h1 className="font-mystical text-[clamp(2.5rem,7vw,4.5rem)] font-bold text-white leading-tight mb-5">
            Your Destiny is in{' '}
            <span className="text-gradient-gold">Your Hands</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Palmistry — the ancient art of reading hands — has guided seekers for thousands of years. AstroAI brings this wisdom into the modern age with AI-powered line analysis.
          </p>
          <Link href="/features/palm-reading">
            <motion.button
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-linear-to-r from-amber-500 to-orange-400 text-[#060D1B] font-bold text-base shadow-lg shadow-amber-500/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              Read My Palm
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* ── Divider ── */}
      <div className="h-px bg-linear-to-r from-transparent via-amber-500/20 to-transparent mx-6" />

      {/* ── Four palm lines ── */}
      {PALM_LINES.map((line, i) => (
        <ParallaxSection key={line.id} line={line} index={i} />
      ))}

      {/* ── CTA ── */}
      <section className="px-6 pb-24 text-center">
        <motion.div
          className="max-w-xl mx-auto glass-card rounded-3xl p-10"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-mystical text-3xl font-bold text-white mb-3">Unlock Your Palm Reading</h2>
          <p className="text-slate-400 mb-7">Let AstroAI analyse your palm lines and reveal what your hands say about your love, mind, health, and destiny.</p>
          <Link href="/features/palm-reading">
            <motion.button
              className="px-8 py-4 rounded-full bg-linear-to-r from-amber-500 to-orange-400 text-[#060D1B] font-bold text-base shadow-lg shadow-amber-500/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              Start Free Palm Reading
            </motion.button>
          </Link>
        </motion.div>
      </section>
    </>
  )
}
