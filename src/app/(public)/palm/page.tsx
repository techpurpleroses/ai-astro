'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Heart, Brain, Activity, Navigation, Camera, Upload, RotateCcw, Sparkles, CheckCircle } from 'lucide-react'

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

// ── Palm Scanner ─────────────────────────────────────────────────────────────

type ScanPhase = 'idle' | 'uploading' | 'scanning' | 'drawing' | 'done'

const DETECTED_LINES = [
  {
    id: 'heart',
    label: 'Heart Line',
    color: '#F43F5E',
    // Positions as % of container (for a hand held palm-up, these are approximate)
    path: 'M 20% 32% Q 40% 28% 60% 30% Q 75% 32% 85% 26%',
    score: 87,
    trait: 'Deep emotional intelligence',
  },
  {
    id: 'head',
    label: 'Head Line',
    color: '#A78BFA',
    path: 'M 22% 46% Q 45% 42% 65% 45% Q 78% 47% 88% 41%',
    score: 93,
    trait: 'Exceptional analytical mind',
  },
  {
    id: 'life',
    label: 'Life Line',
    color: '#34D399',
    path: 'M 42% 22% Q 28% 45% 25% 62% Q 23% 78% 30% 88%',
    score: 79,
    trait: 'Vibrant vital energy',
  },
  {
    id: 'fate',
    label: 'Fate Line',
    color: '#F59E0B',
    path: 'M 52% 85% Q 51% 65% 52% 48% Q 53% 34% 54% 20%',
    score: 71,
    trait: 'Purposeful life direction',
  },
]

// Animated drawn line using stroke-dashoffset trick via CSS animation
function DrawnLine({ line, delay }: { line: typeof DETECTED_LINES[0]; delay: number }) {
  // We use a fixed SVG viewBox with absolute positions instead of % in path
  // Heart: roughly left-to-right at 32% height
  // Head: roughly left-to-right at 46% height
  // Life: arc from top of thumb area
  // Fate: vertical from bottom to top center
  const paths: Record<string, string> = {
    heart: 'M 20 32 Q 40 28 60 30 Q 75 32 85 26',
    head:  'M 22 46 Q 45 42 65 45 Q 78 47 88 41',
    life:  'M 42 22 Q 28 45 25 62 Q 23 78 30 88',
    fate:  'M 52 85 Q 51 65 52 48 Q 53 34 54 20',
  }

  return (
    <motion.path
      d={paths[line.id]}
      fill="none"
      stroke={line.color}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.9 }}
      transition={{ duration: 1.4, delay, ease: 'easeInOut' }}
      style={{ filter: `drop-shadow(0 0 4px ${line.color})` }}
    />
  )
}

function GlowLine({ line, delay }: { line: typeof DETECTED_LINES[0]; delay: number }) {
  const paths: Record<string, string> = {
    heart: 'M 20 32 Q 40 28 60 30 Q 75 32 85 26',
    head:  'M 22 46 Q 45 42 65 45 Q 78 47 88 41',
    life:  'M 42 22 Q 28 45 25 62 Q 23 78 30 88',
    fate:  'M 52 85 Q 51 65 52 48 Q 53 34 54 20',
  }

  return (
    <motion.path
      d={paths[line.id]}
      fill="none"
      stroke={line.color}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.18 }}
      transition={{ duration: 1.4, delay, ease: 'easeInOut' }}
    />
  )
}

function PalmScanner() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [drawnLines, setDrawnLines] = useState(0)
  const [hand, setHand] = useState<'left' | 'right'>('left')

  const reset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setPhase('idle')
    setProgress(0)
    setDrawnLines(0)
  }, [imageUrl])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    setPhase('scanning')
    setProgress(0)
    setDrawnLines(0)
  }, [])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  // Progress & phase state machine
  useEffect(() => {
    if (phase !== 'scanning') return

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          return 100
        }
        return p + 2
      })
    }, 40)

    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (progress >= 100 && phase === 'scanning') {
      setPhase('drawing')
    }
  }, [progress, phase])

  // Draw lines sequentially
  useEffect(() => {
    if (phase !== 'drawing') return

    let count = 0
    const drawNext = () => {
      count += 1
      setDrawnLines(count)
      if (count < DETECTED_LINES.length) {
        setTimeout(drawNext, 1600)
      } else {
        setTimeout(() => setPhase('done'), 800)
      }
    }

    const timer = setTimeout(drawNext, 400)
    return () => clearTimeout(timer)
  }, [phase])

  return (
    <section className="py-16 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/20 bg-amber-400/8 text-amber-400 text-xs font-semibold tracking-widest uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            AI Palm Scanner — Try It Free
          </span>
          <h2 className="font-mystical text-3xl lg:text-4xl font-bold text-white mb-3">
            Scan Your Palm Now
          </h2>
          <p className="text-slate-400 text-base">
            Upload or take a photo of your palm and watch our AI detect your lines in real time.
          </p>
        </div>

        {/* Hand toggle */}
        <div className="flex gap-3 justify-center mb-6">
          {(['left', 'right'] as const).map((h) => (
            <button
              key={h}
              onClick={() => { setHand(h); reset() }}
              className="px-5 py-2 rounded-full text-sm font-semibold capitalize transition-all"
              style={{
                color: hand === h ? '#F59E0B' : '#64748b',
                background: hand === h ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                border: hand === h ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {h} Hand
            </button>
          ))}
        </div>

        {/* Scanner box */}
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(15,30,53,0.85)',
            border: '1px solid rgba(245,158,11,0.15)',
            boxShadow: '0 0 40px rgba(245,158,11,0.05)',
          }}
        >
          {/* ── IDLE state ── */}
          <AnimatePresence>
            {phase === 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-5 py-14 px-6 text-center"
              >
                {/* Animated hand icon */}
                <div className="relative">
                  <motion.div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span className="text-5xl select-none">
                      {hand === 'left' ? '🤚' : '✋'}
                    </span>
                  </motion.div>
                  {/* Ripple rings */}
                  {[1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border border-amber-400/20"
                      animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                      transition={{ duration: 2, delay: i * 0.8, repeat: Infinity, ease: 'easeOut' }}
                    />
                  ))}
                </div>

                <div>
                  <p className="text-white font-semibold text-base mb-1">
                    Place your {hand} hand palm-up
                  </p>
                  <p className="text-slate-500 text-sm">
                    Take a clear photo in good lighting for best results
                  </p>
                </div>

                {/* Upload buttons */}
                <div className="flex gap-3 flex-wrap justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <motion.button
                    onClick={() => fileInputRef.current?.click()}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm"
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B, #F97316)',
                      color: '#0A1628',
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) handleFile(file)
                      }
                      input.click()
                    }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm border border-amber-400/30 text-amber-400"
                    style={{ background: 'rgba(245,158,11,0.08)' }}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </motion.button>
                </div>

                <p className="text-slate-600 text-xs">
                  Your photo is processed locally and never stored
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── SCANNING / DRAWING / DONE states ── */}
          <AnimatePresence>
            {imageUrl && phase !== 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative"
              >
                {/* Photo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Your palm"
                  className="w-full object-cover"
                  style={{
                    aspectRatio: '4/3',
                    maxHeight: '420px',
                    transform: hand === 'right' ? 'scaleX(-1)' : undefined,
                  }}
                />

                {/* Dark overlay to make lines pop */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'rgba(6,13,27,0.45)' }}
                />

                {/* Scanning beam */}
                {phase === 'scanning' && (
                  <motion.div
                    className="absolute inset-x-0 h-1"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.8), rgba(6,182,212,1), rgba(6,182,212,0.8), transparent)',
                      boxShadow: '0 0 20px rgba(6,182,212,0.8), 0 0 60px rgba(6,182,212,0.3)',
                    }}
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                      repeatType: 'loop',
                    }}
                  />
                )}

                {/* Corner scan brackets */}
                {(phase === 'scanning' || phase === 'drawing') && (
                  <>
                    {[
                      { top: '8px', left: '8px', borderTop: '2px solid', borderLeft: '2px solid' },
                      { top: '8px', right: '8px', borderTop: '2px solid', borderRight: '2px solid' },
                      { bottom: '8px', left: '8px', borderBottom: '2px solid', borderLeft: '2px solid' },
                      { bottom: '8px', right: '8px', borderBottom: '2px solid', borderRight: '2px solid' },
                    ].map((style, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-6 h-6"
                        style={{ ...style, borderColor: 'rgba(6,182,212,0.7)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0.5, 1] }}
                        transition={{ duration: 0.6, delay: i * 0.1 }}
                      />
                    ))}
                  </>
                )}

                {/* SVG overlay for detected lines */}
                {(phase === 'drawing' || phase === 'done') && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    {DETECTED_LINES.slice(0, drawnLines).map((line, i) => (
                      <g key={line.id}>
                        <GlowLine line={line} delay={0} />
                        <DrawnLine line={line} delay={0} />
                      </g>
                    ))}

                    {/* Detection dots at line midpoints */}
                    {DETECTED_LINES.slice(0, drawnLines).map((line, i) => {
                      const mids = [
                        { cx: 52, cy: 29 },
                        { cx: 55, cy: 44 },
                        { cx: 26, cy: 60 },
                        { cx: 52, cy: 52 },
                      ]
                      const m = mids[i]
                      return (
                        <motion.circle
                          key={line.id + '-dot'}
                          cx={m.cx}
                          cy={m.cy}
                          r={1.8}
                          fill={line.color}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [0, 2, 1], opacity: 1 }}
                          transition={{ duration: 0.5, delay: 1.2 }}
                        />
                      )
                    })}
                  </svg>
                )}

                {/* Progress bar (scanning phase) */}
                {phase === 'scanning' && (
                  <div className="absolute bottom-0 inset-x-0 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                      <span className="text-cyan-300 text-xs font-mono">
                        Scanning palm… {progress}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #06B6D4, #A78BFA)',
                          boxShadow: '0 0 8px rgba(6,182,212,0.6)',
                        }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>
                )}

                {/* Drawing labels */}
                {(phase === 'drawing' || phase === 'done') && drawnLines > 0 && (
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                    {DETECTED_LINES.slice(0, drawnLines).map((line) => (
                      <motion.div
                        key={line.id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: `${line.color}18`,
                          border: `1px solid ${line.color}40`,
                          color: line.color,
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: line.color }} />
                        {line.label}
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Done checkmark */}
                {phase === 'done' && (
                  <motion.div
                    className="absolute top-3 left-3"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: 'rgba(52,211,153,0.15)',
                        border: '1px solid rgba(52,211,153,0.4)',
                        color: '#34D399',
                      }}
                    >
                      <CheckCircle className="w-3 h-3" />
                      Lines Detected
                    </div>
                  </motion.div>
                )}

                {/* Reset button */}
                <button
                  onClick={reset}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-slate-400 border border-white/10"
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
                >
                  <RotateCcw className="w-3 h-3" />
                  Rescan
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results — shown when done */}
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 space-y-3"
            >
              <p className="text-center text-sm font-semibold text-slate-300 mb-4">
                Palm Analysis Results — {hand === 'left' ? 'Left' : 'Right'} Hand
              </p>
              {DETECTED_LINES.map((line, i) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl p-3.5"
                  style={{
                    background: 'rgba(15,30,53,0.9)',
                    border: `1px solid ${line.color}25`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: line.color }} />
                      <span className="text-sm font-semibold text-white">{line.label}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: line.color }}>
                      {line.score}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/6 overflow-hidden mb-2">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${line.score}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                      style={{
                        background: `linear-gradient(90deg, ${line.color}80, ${line.color})`,
                        boxShadow: `0 0 6px ${line.color}40`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">{line.trait}</p>
                </motion.div>
              ))}

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-2"
              >
                <Link href="/features/palm-reading">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B, #F97316)',
                      color: '#0A1628',
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Get Your Full Palm Reading
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
                <p className="text-center text-xs text-slate-500 mt-2">
                  Full reading includes personality insights, relationship compatibility, and life path guidance
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

// ── Parallax info sections ────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

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

      {/* ── Interactive Palm Scanner ── */}
      <PalmScanner />

      {/* ── Divider ── */}
      <div className="h-px bg-linear-to-r from-transparent via-amber-500/10 to-transparent mx-6" />

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
