'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { gsap } from 'gsap'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  Upload, RotateCcw, ScanLine, Hand,
  Heart, Brain, Activity, Compass,
  CheckCircle2, ChevronRight, Sparkles,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */
type Stage = 'idle' | 'preview' | 'scanning' | 'done'
type Side  = 'left' | 'right'

/* ─── Palm line configuration ───────────────────────────────── */
// Paths are in a 0-100 coordinate space matching the palm image viewport.
// Heart, Head: roughly horizontal. Life: arcs round thumb base. Fate: vertical.
const LINES = [
  {
    id: 'heart',
    name: 'Heart Line',
    icon: Heart,
    hex: '#f43f5e',
    shadow: '0 0 8px #f43f5e, 0 0 20px rgba(244,63,94,0.5)',
    path: 'M10,34 C25,28 44,26 62,29 C74,31 82,27 90,21',
    scanAt: 0.28,
    labelSide: 'right' as const,
    labelPos: { x: '91%', y: '19%' },
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/25',
    textColor: 'text-rose-400',
    confidence: 94,
    reading: 'Deep, expressive emotional nature. You form profound bonds and love with extraordinary loyalty and passion.',
  },
  {
    id: 'head',
    name: 'Head Line',
    icon: Brain,
    hex: '#a78bfa',
    shadow: '0 0 8px #a78bfa, 0 0 20px rgba(167,139,250,0.5)',
    path: 'M10,47 C28,43 48,43 65,44 C78,44 87,40 95,37',
    scanAt: 0.46,
    labelSide: 'right' as const,
    labelPos: { x: '96%', y: '35%' },
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/25',
    textColor: 'text-violet-400',
    confidence: 91,
    reading: 'Balanced creative intuition with sharp analytical thinking. Natural ability to synthesise complex ideas into clear decisions.',
  },
  {
    id: 'life',
    name: 'Life Line',
    icon: Activity,
    hex: '#10b981',
    shadow: '0 0 8px #10b981, 0 0 20px rgba(16,185,129,0.5)',
    path: 'M47,8 C36,18 24,33 19,52 C15,66 18,80 23,94',
    scanAt: 0.58,
    labelSide: 'left' as const,
    labelPos: { x: '4%', y: '54%' },
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    textColor: 'text-emerald-400',
    confidence: 97,
    reading: 'Long, strong and unbroken. Exceptional vitality, resilience, and a richly transformative life journey ahead.',
  },
  {
    id: 'fate',
    name: 'Fate Line',
    icon: Compass,
    hex: '#f59e0b',
    shadow: '0 0 8px #f59e0b, 0 0 20px rgba(245,158,11,0.5)',
    path: 'M50,95 C51,78 51,62 50,48 C49,33 49,19 47,6',
    scanAt: 0.70,
    labelSide: 'right' as const,
    labelPos: { x: '53%', y: '4%' },
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
    textColor: 'text-amber-400',
    confidence: 88,
    reading: 'Clear and purposeful. A strong sense of destiny guides your career choices toward your highest calling.',
  },
] as const

const ANALYSIS_STEPS = [
  'Initializing palm scanner…',
  'Detecting hand boundaries…',
  'Mapping palm topology…',
  'Tracing heart line…',
  'Analyzing head line…',
  'Measuring life line…',
  'Identifying fate line…',
  'Cross-referencing palmistry database…',
  '4 lines detected — generating reading ✦',
]

/* ─── Corner bracket SVG ─────────────────────────────────────── */
function CornerBrackets({ animate }: { animate: boolean }) {
  const corners = [
    { cx: 0,   cy: 0,   path: 'M0,14 L0,0 L14,0'     }, // top-left
    { cx: 100, cy: 0,   path: 'M86,0 L100,0 L100,14'  }, // top-right
    { cx: 0,   cy: 100, path: 'M0,86 L0,100 L14,100'  }, // bottom-left
    { cx: 100, cy: 100, path: 'M86,100 L100,100 L100,86'}, // bottom-right
  ]

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
    >
      {corners.map((c, i) => (
        <motion.path
          key={i}
          d={c.path}
          fill="none"
          stroke="rgba(6,182,212,0.9)"
          strokeWidth="0.8"
          strokeLinecap="square"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={animate ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
        />
      ))}
    </svg>
  )
}

/* ─── Grid overlay ────────────────────────────────────────────── */
function GridOverlay({ visible }: { visible: boolean }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4 }}
      style={{
        backgroundImage: `
          linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '12.5% 12.5%',
      }}
    />
  )
}

/* ─── Detection label ─────────────────────────────────────────── */
function DetectionLabel({
  line,
  visible,
}: {
  line: typeof LINES[number]
  visible: boolean
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute z-30 pointer-events-none"
          style={{ left: line.labelPos.x, top: line.labelPos.y, transform: 'translateY(-50%)' }}
          initial={{ opacity: 0, scale: 0.6, x: line.labelSide === 'right' ? -12 : 12 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
        >
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold whitespace-nowrap ${line.bg} ${line.border} ${line.textColor}`}
            style={{ boxShadow: `0 0 12px ${line.hex}40` }}
          >
            <line.icon className="w-2.5 h-2.5" />
            {line.name}
            <span className="opacity-60">{line.confidence}%</span>
          </div>
          {/* Connector dot */}
          <div
            className="absolute w-1.5 h-1.5 rounded-full top-1/2 -translate-y-1/2"
            style={{
              [line.labelSide === 'right' ? 'left' : 'right']: '-6px',
              background: line.hex,
              boxShadow: `0 0 6px ${line.hex}`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Main component ─────────────────────────────────────────── */
export function PalmScanDemo() {
  const [stage, setStage]         = useState<Stage>('idle')
  const [side, setSide]           = useState<Side>('right')
  const [imageUrl, setImageUrl]   = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [revealed, setRevealed]   = useState<Set<string>>(new Set())
  const [analysisText, setAnalysis] = useState('')
  const [scanPct, setScanPct]     = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const tlRef   = useRef<gsap.core.Timeline | null>(null)

  /* Cleanup blob URLs */
  useEffect(() => {
    return () => {
      if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(file))
    setStage('preview')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [])

  const useDemo = () => {
    setImageUrl('/palm/life-line.jpg')
    setStage('preview')
  }

  const startScan = useCallback(() => {
    setStage('scanning')
    setRevealed(new Set())
    setScanPct(0)

    let step = 0
    const ticker = setInterval(() => {
      setAnalysis(ANALYSIS_STEPS[Math.min(step, ANALYSIS_STEPS.length - 1)])
      step++
      if (step >= ANALYSIS_STEPS.length) clearInterval(ticker)
    }, 350)

    const proxy = { p: 0 }
    const tl = gsap.timeline()
    tlRef.current = tl

    tl.to(proxy, {
      p: 1,
      duration: 3.2,
      ease: 'none',
      onUpdate() {
        const p = proxy.p
        setScanPct(p)
        setRevealed((prev) => {
          let changed = false
          const next = new Set(prev)
          LINES.forEach((l) => {
            if (p >= l.scanAt && !next.has(l.id)) { next.add(l.id); changed = true }
          })
          return changed ? next : prev
        })
      },
      onComplete() {
        clearInterval(ticker)
        setAnalysis(ANALYSIS_STEPS[ANALYSIS_STEPS.length - 1])
        setTimeout(() => setStage('done'), 800)
      },
    })
  }, [])

  const reset = () => {
    tlRef.current?.kill()
    setStage('idle')
    setImageUrl(null)
    setRevealed(new Set())
    setAnalysis('')
    setScanPct(0)
  }

  const isScanning = stage === 'scanning'
  const isDone     = stage === 'done'

  return (
    <div className="w-full">
      {/* ── Idle: upload area ── */}
      <AnimatePresence mode="wait">
        {stage === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center"
          >
            {/* Hand side toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-midnight-800/60 border border-white/6 mb-8">
              {(['left', 'right'] as Side[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize ${
                    side === s
                      ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Hand className="w-3.5 h-3.5" />
                  {s} Hand
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <div
              className={`relative w-full max-w-md aspect-[3/4] rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-5 cursor-pointer ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-400/8 scale-[1.01]'
                  : 'border-white/12 bg-midnight-800/30 hover:border-cyan-400/40 hover:bg-midnight-800/50'
              }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {/* Glow on drag */}
              {isDragging && (
                <div className="absolute inset-0 rounded-2xl bg-cyan-400/5 blur-xl" />
              )}

              <motion.div
                animate={{ y: isDragging ? -6 : [0, -6, 0] }}
                transition={{ repeat: isDragging ? 0 : Infinity, duration: 2.5 }}
                className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center"
              >
                <Upload className="w-8 h-8 text-cyan-400" />
              </motion.div>

              <div className="text-center px-6">
                <p className="text-white font-semibold mb-1">
                  {isDragging ? 'Drop your palm photo' : 'Upload your palm photo'}
                </p>
                <p className="text-slate-500 text-sm">
                  Drag & drop or click · JPG, PNG, HEIC
                </p>
              </div>

              {/* Corner accents */}
              {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => (
                <div
                  key={corner}
                  className={`absolute w-4 h-4 border-cyan-400/30 ${
                    corner === 'top-left'     ? 'top-3 left-3 border-t border-l' :
                    corner === 'top-right'    ? 'top-3 right-3 border-t border-r' :
                    corner === 'bottom-left'  ? 'bottom-3 left-3 border-b border-l' :
                                                'bottom-3 right-3 border-b border-r'
                  }`}
                />
              ))}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f) }}
            />

            {/* Demo button */}
            <button
              onClick={useDemo}
              className="mt-4 flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-sm transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Try with a demo palm photo
            </button>
          </motion.div>
        )}

        {/* ── Preview / Scanning / Done ── */}
        {(stage === 'preview' || isScanning || isDone) && imageUrl && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col lg:flex-row gap-8 items-start"
          >
            {/* Left: Image viewport */}
            <div className="w-full lg:w-[420px] shrink-0">
              {/* Viewport */}
              <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-midnight-900 border border-white/8 shadow-2xl">

                {/* Palm photo */}
                <Image
                  src={imageUrl}
                  alt="Palm"
                  fill
                  className="object-cover"
                  unoptimized={imageUrl.startsWith('blob:')}
                />

                {/* Dark overlay during scan */}
                {(isScanning || isDone) && (
                  <div className="absolute inset-0 bg-[#060D1B]/30" />
                )}

                {/* Grid overlay */}
                <GridOverlay visible={isScanning || isDone} />

                {/* Scan sweep line */}
                {isScanning && (
                  <div
                    className="absolute left-0 right-0 h-[2px] pointer-events-none z-20"
                    style={{
                      top: `${scanPct * 100}%`,
                      background:
                        'linear-gradient(90deg, transparent, rgba(6,182,212,0.3) 15%, rgba(6,182,212,1) 50%, rgba(6,182,212,0.3) 85%, transparent)',
                      boxShadow:
                        '0 0 12px rgba(6,182,212,0.9), 0 0 30px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.15)',
                    }}
                  />
                )}

                {/* Scanned area tint (below sweep) */}
                {isScanning && (
                  <div
                    className="absolute left-0 right-0 bottom-0 pointer-events-none z-10"
                    style={{
                      top: `${scanPct * 100}%`,
                      background: 'rgba(6,13,27,0.25)',
                    }}
                  />
                )}

                {/* SVG palm line overlay */}
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full pointer-events-none z-20"
                  preserveAspectRatio="none"
                >
                  {LINES.map((line) => (
                    <path
                      key={line.id}
                      d={line.path}
                      fill="none"
                      stroke={line.hex}
                      strokeWidth="0.9"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      style={{
                        strokeDasharray: 500,
                        strokeDashoffset: revealed.has(line.id) ? 0 : 500,
                        transition: `stroke-dashoffset 0.85s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.3s`,
                        filter: `drop-shadow(0 0 3px ${line.hex}) drop-shadow(0 0 8px ${line.hex}80)`,
                        opacity: revealed.has(line.id) ? 1 : 0,
                      }}
                    />
                  ))}

                  {/* Pulse dots at line junctions */}
                  {LINES.map((line) =>
                    revealed.has(line.id) ? (
                      <g key={`dot-${line.id}`}>
                        <circle
                          cx={line.id === 'heart' ? 55 : line.id === 'head' ? 50 : line.id === 'life' ? 21 : 50}
                          cy={line.id === 'heart' ? 28 : line.id === 'head' ? 43 : line.id === 'life' ? 52 : 48}
                          r="1.5"
                          fill={line.hex}
                          opacity="0.9"
                        >
                          <animate attributeName="r" values="1.5;3;1.5" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
                        </circle>
                      </g>
                    ) : null
                  )}
                </svg>

                {/* Corner brackets */}
                <CornerBrackets animate={isScanning || isDone} />

                {/* Detection labels */}
                {LINES.map((line) => (
                  <DetectionLabel key={line.id} line={line} visible={revealed.has(line.id)} />
                ))}

                {/* "SCANNING" badge */}
                {isScanning && (
                  <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#060D1B]/80 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    SCANNING
                  </div>
                )}

                {/* "DONE" badge */}
                {isDone && (
                  <motion.div
                    className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wider"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    4 LINES DETECTED
                  </motion.div>
                )}

                {/* Progress bar at bottom */}
                {isScanning && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 z-30">
                    <motion.div
                      className="h-full bg-linear-to-r from-cyan-400 to-teal-400"
                      style={{ width: `${scanPct * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Analysis text */}
              <AnimatePresence mode="wait">
                {isScanning && analysisText && (
                  <motion.div
                    key={analysisText}
                    className="mt-3 flex items-center gap-2 text-slate-400 text-xs font-mono"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ScanLine className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    {analysisText}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="mt-4 flex items-center gap-3">
                {stage === 'preview' && (
                  <motion.button
                    onClick={startScan}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-linear-to-r from-cyan-500 to-teal-400 text-[#060D1B] font-bold text-sm shadow-lg shadow-cyan-500/20"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <ScanLine className="w-4 h-4" />
                    Scan My Palm
                  </motion.button>
                )}

                {isDone && (
                  <Link href="/features/palm-reading" className="flex-1">
                    <motion.button
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-400 text-[#060D1B] font-bold text-sm shadow-lg shadow-amber-500/20"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Get Full Reading in App
                    </motion.button>
                  </Link>
                )}

                <button
                  onClick={reset}
                  className="p-3.5 rounded-xl border border-white/8 text-slate-500 hover:text-white hover:border-white/20 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Results panel */}
            <div className="flex-1 min-w-0">
              <AnimatePresence>
                {isDone ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase mb-4">
                      Reading Results
                    </p>
                    <div className="space-y-3">
                      {LINES.map((line, i) => (
                        <motion.div
                          key={line.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: i * 0.12 }}
                          className={`glass-card rounded-2xl p-5 border ${line.border} relative overflow-hidden group`}
                        >
                          {/* Left accent bar */}
                          <div
                            className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full"
                            style={{ background: line.hex, boxShadow: `0 0 8px ${line.hex}` }}
                          />

                          {/* Confidence badge */}
                          <div className="absolute top-4 right-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${line.bg} ${line.textColor}`}>
                              {line.confidence}% match
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 mb-2 pl-3">
                            <line.icon className={`w-4 h-4 ${line.textColor} shrink-0`} />
                            <h4 className="font-display font-bold text-white text-sm">{line.name}</h4>
                          </div>
                          <p className="text-slate-400 text-sm leading-relaxed pl-3">
                            {line.reading}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Disclaimer */}
                    <p className="text-slate-600 text-xs mt-4 leading-relaxed">
                      This is a visual demo. For a full AI-powered palm reading with detailed interpretations, open the AstroAI app.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {isScanning ? (
                      <>
                        <div className="relative w-16 h-16">
                          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
                          <div className="absolute inset-0 rounded-full border border-cyan-500/40" />
                          <ScanLine className="absolute inset-0 m-auto w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Analysing your palm…</p>
                          <p className="text-slate-500 text-sm mt-1">
                            {Math.round(scanPct * 4)} of 4 lines detected
                          </p>
                        </div>
                        {/* Live line count */}
                        <div className="flex gap-2 flex-wrap justify-center">
                          {LINES.map((line) => (
                            <AnimatePresence key={line.id}>
                              {revealed.has(line.id) && (
                                <motion.span
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${line.bg} ${line.textColor} border ${line.border}`}
                                  initial={{ opacity: 0, scale: 0.7 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 400 }}
                                >
                                  <line.icon className="w-3 h-3" />
                                  {line.name}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <Hand className="w-12 h-12 text-slate-700" />
                        <p className="text-slate-500 text-sm">Press &ldquo;Scan My Palm&rdquo; to begin</p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
