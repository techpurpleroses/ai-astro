'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles, Shield, Zap, Heart, Star, Globe } from 'lucide-react'

const VALUES = [
  { icon: Star,    title: 'Ancient Wisdom',   desc: 'We root every interpretation in thousands of years of astrological tradition and scholarship.', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { icon: Zap,     title: 'AI Precision',     desc: 'Our AI synthesises planetary positions, aspects, and transits to deliver nuanced, personalised readings.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { icon: Heart,   title: 'Genuine Care',     desc: 'We believe cosmic guidance should empower, never prescribe. Your free will always comes first.', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  { icon: Shield,  title: 'Privacy First',    desc: 'Your birth data is sacred. We never sell your information or share it with third parties. Ever.', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { icon: Globe,   title: 'Inclusive Space',  desc: 'Astrology belongs to everyone. We welcome all seekers regardless of background, belief, or experience.', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { icon: Sparkles,'title': 'Continuous Growth', desc: 'The cosmos never stops moving, and neither do we. New features and deeper insights arrive regularly.', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
]

const STATS = [
  { n: '1M+',  label: 'Readings Delivered' },
  { n: '500K+', label: 'Active Seekers' },
  { n: '12',   label: 'Cosmic Features' },
  { n: '4.9★', label: 'Average Rating' },
]

const HOW_STEPS = [
  { n: '01', title: 'Enter Your Birth Details', desc: 'Your birth date, time, and location create a unique cosmic fingerprint that no one else on earth shares.' },
  { n: '02', title: 'AI Reads Your Chart',      desc: 'Our model analyses planetary positions at your birth moment, cross-referencing centuries of astrological scholarship.' },
  { n: '03', title: 'Receive Your Guidance',    desc: 'Daily horoscopes, birth chart breakdowns, compatibility reports, and more — all tailored specifically to you.' },
]

function cardAnim(i: number) {
  return {
    initial: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true as const },
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const },
  }
}

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(6,182,212,0.08)_0%,transparent_65%)] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 80 }, (_, i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${(i*73+17)%100}%`, top: `${(i*47+11)%100}%`, width: `${0.5+(i%5)*0.35}px`, height: `${0.5+(i%5)*0.35}px`, opacity: (0.1+(i%6)*0.07).toFixed(2), animation: `twinkle ${2+(i%4)*0.8}s ${(i*0.37)%6}s ease-in-out infinite` }} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="relative max-w-3xl mx-auto"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/8 text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-5">
            Our Story
          </span>
          <h1 className="font-mystical text-[clamp(2.5rem,7vw,4.5rem)] font-bold text-white leading-tight mb-6">
            Where Ancient Wisdom{' '}
            <span className="text-gradient-cyan">Meets Modern AI</span>
          </h1>
          <p className="text-slate-400 text-xl leading-relaxed">
            AstroAI was born from a simple belief: the wisdom encoded in the stars should be accessible to everyone — not just those who have spent years studying astrology.
          </p>
        </motion.div>
      </section>

      {/* ── Mission ── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_30%_50%,rgba(6,182,212,0.05)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute top-6 right-6 opacity-10">
              <Image src="/decorative/gem-violet.png" alt="" width={120} height={120} />
            </div>
            <motion.div
              className="relative max-w-2xl"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="font-mystical text-3xl sm:text-4xl font-bold text-white mb-5">Our Mission</h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-5">
                We believe astrology is not about destiny being fixed — it is about understanding the cosmic weather and navigating it wisely. Just as a sailor reads the stars to chart a course, we help you read yours.
              </p>
              <p className="text-slate-400 leading-relaxed">
                By combining the interpretive depth of traditional astrology with the computational power of modern AI, AstroAI delivers readings that are both deeply rooted in tradition and startlingly personal. We process thousands of astrological variables in seconds, so you receive guidance that actually reflects your unique cosmic fingerprint.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          >
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={{ hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
                className="text-center glass-card rounded-2xl p-6"
              >
                <p className="font-mystical text-3xl sm:text-4xl font-bold text-gradient-cyan mb-1">{stat.n}</p>
                <p className="text-slate-500 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            className="font-mystical text-3xl sm:text-4xl font-bold text-white text-center mb-12"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            How AstroAI Works
          </motion.h2>
          <div className="space-y-4">
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                {...cardAnim(i)}
                className="flex gap-6 glass-card rounded-2xl p-7 group hover:-translate-y-0.5 transition-transform duration-200"
              >
                <div className="shrink-0 font-mystical text-4xl font-bold text-gradient-cyan opacity-40 group-hover:opacity-70 transition-opacity leading-none pt-1">
                  {step.n}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-lg mb-2">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            className="font-mystical text-3xl sm:text-4xl font-bold text-white text-center mb-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            What We Stand For
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map((v, i) => (
              <motion.div
                key={v.title}
                {...cardAnim(i)}
                className={`glass-card rounded-2xl p-6 border ${v.border} group hover:-translate-y-1.5 transition-transform duration-200`}
              >
                <div className={`w-11 h-11 rounded-xl ${v.bg} border ${v.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <v.icon className={`w-5 h-5 ${v.color}`} />
                </div>
                <h3 className="font-display font-bold text-white mb-2">{v.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
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
          <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
          <h2 className="font-mystical text-3xl font-bold text-white mb-3">Begin Your Journey</h2>
          <p className="text-slate-400 mb-7">Join 500K+ seekers navigating life with the wisdom of the cosmos.</p>
          <Link href="/today">
            <motion.button
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-linear-to-r from-cyan-500 to-teal-400 text-[#060D1B] font-bold text-base shadow-lg shadow-cyan-500/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              Start Free <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </section>
    </>
  )
}
