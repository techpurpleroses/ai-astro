'use client'

/**
 * PalmCameraScanner
 *
 * Captures a palm photo (camera or upload), sends it to /api/palm-detect
 * (GPT-4o Vision), receives normalized crease-line coordinates, and
 * animates the four classical palm lines (heart / head / life / fate)
 * onto a canvas overlay.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, RotateCcw, X, Lightbulb, CheckCircle, AlertCircle, Hand } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'camera' | 'scanning' | 'drawing' | 'results' | 'error'

type Pt = [number, number]
type LinePts = [Pt, Pt, Pt]

interface DetectedLines {
  heart: LinePts
  head:  LinePts
  life:  LinePts
  fate:  LinePts
}

interface PalmLine {
  id: 'heart' | 'head' | 'life' | 'fate'
  label: string
  color: string
  score: number
  trait: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LINE_META: PalmLine[] = [
  { id: 'heart', label: 'Heart Line', color: '#F43F5E', score: 0, trait: 'Emotional depth & relationships' },
  { id: 'head',  label: 'Head Line',  color: '#06B6D4', score: 0, trait: 'Intellect & thinking style' },
  { id: 'life',  label: 'Life Line',  color: '#84CC16', score: 0, trait: 'Vitality & life journey' },
  { id: 'fate',  label: 'Fate Line',  color: '#F59E0B', score: 0, trait: 'Purpose & career direction' },
]

const LINE_ORDER: Array<'heart' | 'head' | 'life' | 'fate'> = ['heart', 'head', 'life', 'fate']
const LINE_COLORS: Record<'heart' | 'head' | 'life' | 'fate', string> = {
  heart: '#F43F5E', head: '#06B6D4', life: '#84CC16', fate: '#F59E0B',
}

// ── Canvas drawing ────────────────────────────────────────────────────────────

function drawLine(
  ctx: CanvasRenderingContext2D,
  pts: LinePts,
  color: string,
  progress: number,
) {
  const [start, ctrl, end] = pts

  // Glow layer
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(start[0], start[1])
  ctx.quadraticCurveTo(ctrl[0], ctrl[1], end[0], end[1])
  ctx.strokeStyle = color
  ctx.lineWidth = 8
  ctx.globalAlpha = 0.15 * progress
  ctx.shadowColor = color
  ctx.shadowBlur = 24
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  // Main line — partial bezier via t-steps
  ctx.save()
  ctx.beginPath()
  const steps = 80
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * progress
    const x = (1-t)*(1-t)*start[0] + 2*(1-t)*t*ctrl[0] + t*t*end[0]
    const y = (1-t)*(1-t)*start[1] + 2*(1-t)*t*ctrl[1] + t*t*end[1]
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.globalAlpha = 0.92 * progress
  ctx.shadowColor = color
  ctx.shadowBlur = 10
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  // Tip dot when nearly complete
  if (progress > 0.85) {
    const ex = end[0], ey = end[1]
    ctx.save()
    ctx.beginPath()
    ctx.arc(ex, ey, 5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = (progress - 0.85) / 0.15
    ctx.shadowColor = color
    ctx.shadowBlur = 14
    ctx.fill()
    ctx.restore()
  }
}

// ── Hand guide overlay ────────────────────────────────────────────────────────

function HandGuideOverlay({ hand }: { hand: 'left' | 'right' }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      animate={{ opacity: [0.3, 0.55, 0.3] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Hand
        strokeWidth={0.5}
        color="white"
        style={{
          width: 'auto',
          height: '62%',
          // Lucide Hand icon is a left hand by default; flip for right
          transform: hand === 'right' ? 'scaleX(-1)' : undefined,
          filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.4))',
        }}
      />
    </motion.div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { hand: 'left' | 'right'; onClose: () => void }

export function PalmCameraScanner({ hand, onClose }: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const captureCanvas = useRef<HTMLCanvasElement>(null)
  const overlayRef    = useRef<HTMLCanvasElement>(null)
  const rafRef        = useRef<number>(0)
  const streamRef     = useRef<MediaStream | null>(null)
  const isBackCamRef  = useRef(false)

  const [phase, setPhase]             = useState<Phase>('intro')
  const [imageUrl, setImageUrl]       = useState<string | null>(null)
  const [imgSize, setImgSize]         = useState<{ w: number; h: number } | null>(null)
  const [errorMsg, setErrorMsg]       = useState('')
  const [drawnCount, setDrawnCount]   = useState(0)
  const [palmLines, setPalmLines]     = useState<PalmLine[]>(LINE_META)
  const [currentLine, setCurrentLine] = useState(-1)
  const [detectedLines, setDetectedLines] = useState<DetectedLines | null>(null)
  const [isBackCam, setIsBackCam]     = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => () => { stopStream(); if (imageUrl) URL.revokeObjectURL(imageUrl) }, [])

  // Attach stream to <video> after camera phase mounts the element
  useEffect(() => {
    if (phase !== 'camera') return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {})
  }, [phase])

  // ── Call OpenAI Vision API to detect palm lines ──
  const analyzeImage = useCallback(async (dataUrl: string, w: number, h: number) => {
    setPhase('scanning')
    try {
      const res = await fetch('/api/palm-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()

      if (data.error) {
        setErrorMsg(
          data.error === 'no_palm'
            ? 'No palm detected. Point the camera at your open palm and try again.'
            : 'Analysis failed. Check your connection and try again.'
        )
        setPhase('error')
        return
      }

      // Scale normalized [0-1] coords to canvas pixel space
      const scale = (pts: LinePts): LinePts =>
        pts.map(([x, y]) => [x * w, y * h]) as LinePts

      const lines: DetectedLines = {
        heart: scale(data.heart),
        head:  scale(data.head),
        life:  scale(data.life),
        fate:  scale(data.fate),
      }
      setDetectedLines(lines)

      // Generate scores (cosmetic — based on line length ratios)
      const lineLen = ([s, , e]: LinePts) =>
        Math.sqrt((e[0]-s[0])**2 + (e[1]-s[1])**2)
      const maxLen = Math.max(lineLen(lines.heart), lineLen(lines.head), lineLen(lines.life), lineLen(lines.fate)) || 1
      setPalmLines(LINE_META.map((l) => ({
        ...l,
        score: Math.min(99, Math.max(55, Math.round(60 + (lineLen(lines[l.id]) / maxLen) * 35 + Math.random() * 5))),
      })))

      setPhase('drawing')
    } catch {
      setErrorMsg('Analysis failed. Check your connection and try again.')
      setPhase('error')
    }
  }, [])

  // ── Open camera ──
  const startCamera = useCallback(async () => {
    const constraints: Array<{ video: MediaTrackConstraints; isBack: boolean }> = [
      { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, isBack: true },
      { video: { facingMode: 'environment',            width: { ideal: 1280 }, height: { ideal: 720 } }, isBack: true },
      { video: { facingMode: 'user',                   width: { ideal: 1280 }, height: { ideal: 720 } }, isBack: false },
      { video: {                                        width: { ideal: 1280 }, height: { ideal: 720 } }, isBack: false },
    ]

    let stream: MediaStream | null = null
    let isBack = false
    for (const { video, isBack: b } of constraints) {
      try { stream = await navigator.mediaDevices.getUserMedia({ video }); isBack = b; break }
      catch { /* try next */ }
    }

    if (!stream) {
      setErrorMsg('Camera access denied. Please grant permission or upload a photo instead.')
      setPhase('error')
      return
    }

    isBackCamRef.current = isBack
    setIsBackCam(isBack)
    streamRef.current = stream
    setPhase('camera')
  }, [])

  // ── Upload photo ──
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    const img = new window.Image()
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
      analyzeImage(url, img.naturalWidth, img.naturalHeight)
    }
    img.src = url
  }, [analyzeImage])

  // ── Capture from camera ──
  const captureFrame = useCallback(async () => {
    const video  = videoRef.current
    const canvas = captureCanvas.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.save()
    if (!isBackCamRef.current) {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    ctx.restore()

    stopStream()

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setImageUrl(dataUrl)
    setImgSize({ w: canvas.width, h: canvas.height })
    await analyzeImage(dataUrl, canvas.width, canvas.height)
  }, [stopStream, analyzeImage])

  // ── Animate lines onto canvas when phase = drawing ──
  useEffect(() => {
    if (phase !== 'drawing' || !detectedLines || !imgSize) return
    const canvas = overlayRef.current
    if (!canvas) return

    canvas.width  = imgSize.w
    canvas.height = imgSize.h
    const ctx = canvas.getContext('2d')!

    let lineIdx = 0
    let startTs: number | null = null
    const DURATION = 1400

    setCurrentLine(0)
    setDrawnCount(0)

    const animate = (ts: number) => {
      if (!startTs) startTs = ts
      const progress = Math.min((ts - startTs) / DURATION, 1)

      ctx.clearRect(0, 0, imgSize.w, imgSize.h)

      for (let i = 0; i < lineIdx; i++) {
        const id = LINE_ORDER[i]
        drawLine(ctx, detectedLines[id], LINE_COLORS[id], 1)
      }

      const currentId = LINE_ORDER[lineIdx]
      drawLine(ctx, detectedLines[currentId], LINE_COLORS[currentId], progress)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        const nextIdx = lineIdx + 1
        setDrawnCount(nextIdx)
        if (nextIdx < LINE_ORDER.length) {
          lineIdx = nextIdx
          setCurrentLine(nextIdx)
          startTs = null
          rafRef.current = requestAnimationFrame(animate)
        } else {
          setCurrentLine(-1)
          setTimeout(() => setPhase('results'), 600)
        }
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(rafRef.current) }
  }, [phase, detectedLines, imgSize])

  // ── Reset ──
  const reset = useCallback(() => {
    stopStream()
    cancelAnimationFrame(rafRef.current)
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setImgSize(null)
    setPhase('intro')
    setErrorMsg('')
    setDrawnCount(0)
    setCurrentLine(-1)
    setDetectedLines(null)
    setPalmLines(LINE_META)
  }, [stopStream, imageUrl])

  const openFilePicker = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFile(file)
    }
    input.click()
  }, [handleFile])

  const isImagePhase = phase === 'scanning' || phase === 'drawing' || phase === 'results'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-107.5 h-full flex flex-col"
        style={{ background: 'rgba(6,13,27,0.97)', backdropFilter: 'blur(20px)' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-sm font-semibold text-white">Palm Scanner</span>
            <span className="text-xs text-slate-500 capitalize">· {hand} hand</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center bg-white/6 text-slate-400"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── CAMERA phase — full-screen live view ── */}
        {phase === 'camera' && (
          <motion.div
            key="camera-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 relative overflow-hidden bg-black"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: isBackCam ? undefined : 'scaleX(-1)' }}
            />
            <canvas ref={captureCanvas} className="hidden" />
            <HandGuideOverlay hand={hand} />

            <button
              onClick={openFilePicker}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/80"
              style={{ background: 'rgba(0,0,0,0.55)' }}
            >
              <Upload size={13} />
              Upload
            </button>

            <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-5">
              <p
                className="text-sm text-white font-medium px-5 py-2 rounded-2xl text-center max-w-65 leading-snug"
                style={{ background: 'rgba(0,0,0,0.62)' }}
              >
                Place your palm inside the outline and take a photo.
              </p>
              <motion.button
                onClick={captureFrame}
                whileTap={{ scale: 0.93 }}
                className="w-18 h-18 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #F43F5E, #E11D48)',
                  boxShadow: '0 0 32px rgba(244,63,94,0.5)',
                }}
              >
                <Camera size={28} className="text-white" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── TEXT phases (intro / error) — centered, constrained ── */}
        {(phase === 'intro' || phase === 'error') && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-sm mx-auto w-full">
              <AnimatePresence mode="wait">

                {phase === 'intro' && (
                  <motion.div
                    key="intro"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-5 px-5 py-10 text-center"
                  >
                    <div className="relative">
                      <motion.div
                        className="w-28 h-28 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <span className="text-6xl select-none">{hand === 'left' ? '🤚' : '✋'}</span>
                      </motion.div>
                      {[1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute inset-0 rounded-full border border-rose-400/15"
                          animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                          transition={{ duration: 2.2, delay: i * 0.9, repeat: Infinity, ease: 'easeOut' }}
                        />
                      ))}
                    </div>

                    <div>
                      <h2 className="text-white font-bold text-lg mb-1">Hold your {hand} palm up</h2>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                        AI analyzes your actual palm photo and traces heart, head, life &amp; fate lines.
                      </p>
                    </div>

                    <div
                      className="w-full rounded-2xl p-4 text-left space-y-2"
                      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb size={13} className="text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">Tips for best results</span>
                      </div>
                      {[
                        'Good lighting — natural light works best',
                        'Spread fingers slightly, palm facing camera',
                        'Keep background plain (table or floor)',
                        'Fill the frame with your full hand',
                      ].map((tip) => (
                        <div key={tip} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-amber-400/50 mt-1.5 shrink-0" />
                          <p className="text-xs text-slate-400">{tip}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                      <motion.button
                        onClick={startCamera}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm"
                        style={{ background: 'linear-gradient(135deg, #F43F5E, #E11D48)', color: 'white' }}
                      >
                        <Camera size={16} />
                        Open Camera
                      </motion.button>
                      <motion.button
                        onClick={openFilePicker}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm"
                        style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.25)', color: '#F43F5E' }}
                      >
                        <Upload size={16} />
                        Upload Palm Photo
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {phase === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-5 px-5 py-16 text-center"
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)' }}
                    >
                      <AlertCircle size={28} className="text-rose-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold mb-2">Detection Failed</p>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{errorMsg}</p>
                    </div>
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm"
                      style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#F43F5E' }}
                    >
                      <RotateCcw size={15} />
                      Try Again
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── IMAGE phases (scanning / drawing / results) — full-width ── */}
        {isImagePhase && imageUrl && (
          <div className="flex-1 flex flex-col min-h-0">

            {/* Full-width image + canvas overlay — no forced aspect ratio */}
            <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Palm"
                className="absolute inset-0 w-full h-full object-contain"
              />

              {/* Dark overlay (lighter during drawing/results) */}
              <div
                className="absolute inset-0"
                style={{ background: phase === 'scanning' ? 'rgba(6,13,27,0.45)' : 'rgba(6,13,27,0.2)' }}
              />

              {/* Canvas — mounted during scanning, persists through drawing + results */}
              <canvas
                ref={overlayRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Scanning: sweep beam + brackets */}
              {phase === 'scanning' && (
                <>
                  <motion.div
                    className="absolute inset-x-0 h-0.5"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.8), #F43F5E, rgba(244,63,94,0.8), transparent)',
                      boxShadow: '0 0 20px rgba(244,63,94,0.8), 0 0 60px rgba(244,63,94,0.3)',
                    }}
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
                  />
                  {[
                    { top: 10, left: 10, borderTop: '2px solid', borderLeft: '2px solid' },
                    { top: 10, right: 10, borderTop: '2px solid', borderRight: '2px solid' },
                    { bottom: 10, left: 10, borderBottom: '2px solid', borderLeft: '2px solid' },
                    { bottom: 10, right: 10, borderBottom: '2px solid', borderRight: '2px solid' },
                  ].map((s, i) => (
                    <motion.div
                      key={i} className="absolute w-7 h-7"
                      style={{ ...s, borderColor: 'rgba(244,63,94,0.7)' }}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
                    />
                  ))}
                  <div className="absolute bottom-3 inset-x-0 flex justify-center">
                    <motion.span
                      className="text-xs text-rose-300 px-3 py-1.5 rounded-full font-medium"
                      style={{ background: 'rgba(0,0,0,0.75)' }}
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      Analyzing palm lines with AI…
                    </motion.span>
                  </div>
                </>
              )}

              {/* Drawing + Results: completed line tags */}
              {(phase === 'drawing' || phase === 'results') && (
                <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                  {LINE_META.slice(0, drawnCount).map((l) => (
                    <motion.div
                      key={l.id}
                      initial={{ x: 24, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: `${l.color}20`, border: `1px solid ${l.color}50`, color: l.color }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                      {l.label}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Drawing: current line label */}
              {phase === 'drawing' && currentLine >= 0 && (
                <motion.div
                  className="absolute bottom-3 inset-x-0 flex justify-center"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                >
                  <span
                    className="text-[11px] px-3 py-1 rounded-full font-mono"
                    style={{ background: 'rgba(0,0,0,0.8)', color: LINE_META[currentLine]?.color }}
                  >
                    Tracing {LINE_META[currentLine]?.label}…
                  </span>
                </motion.div>
              )}

              {/* Results: done badge */}
              {phase === 'results' && (
                <motion.div
                  className="absolute top-3 left-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                >
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#34D399' }}
                  >
                    <CheckCircle size={11} />
                    4 Lines Detected
                  </div>
                </motion.div>
              )}
            </div>

            {/* Results panel — scrollable below the image */}
            {phase === 'results' && (
              <div className="overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '45%' }}>
                <p className="text-xs font-semibold text-slate-400">Your Palm Analysis</p>
                {palmLines.map((line, i) => (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-xl p-3.5"
                    style={{ background: 'rgba(15,30,53,0.9)', border: `1px solid ${line.color}22` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: line.color }} />
                        <span className="text-sm font-semibold text-white">{line.label}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: line.color }}>{line.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/6 overflow-hidden mb-2">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${line.score}%` }}
                        transition={{ duration: 0.9, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                        style={{ background: `linear-gradient(90deg, ${line.color}70, ${line.color})`, boxShadow: `0 0 6px ${line.color}40` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">{line.trait}</p>
                  </motion.div>
                ))}
                <div className="pb-2">
                  <button
                    onClick={reset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-400"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <RotateCcw size={14} />
                    Scan Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
