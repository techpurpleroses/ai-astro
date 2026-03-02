'use client'

/**
 * PalmCameraScanner
 *
 * Uses @mediapipe/tasks-vision HandLandmarker to detect 21 hand skeleton
 * landmarks from a live camera feed or uploaded image, then computes and
 * animates the four classical palm lines (heart / head / life / fate) onto
 * a canvas overlay based on anatomical landmark geometry.
 *
 * Landmark → line mapping (all coords normalized 0-1):
 *   Heart Line : lm[17] → lm[13] area → lm[5]  (across MCP row, upper palm)
 *   Head Line  : thumb-index junction  → lm[13]  (below heart, horizontal)
 *   Life Line  : lm[5]-lm[1] junction → lm[0]   (arc around thenar eminence)
 *   Fate Line  : lm[0] → lm[9]                  (vertical mid-palm)
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, RotateCcw, X, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | 'intro'
  | 'loading-model'
  | 'camera'
  | 'scanning'
  | 'drawing'
  | 'results'
  | 'error'

interface NormalizedLandmark { x: number; y: number; z: number }

interface PalmLine {
  id: 'heart' | 'head' | 'life' | 'fate'
  label: string
  color: string
  score: number
  trait: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

// WASM + model served locally — no CDN dependency, no version mismatch.
const WASM_PATH = '/mediapipe-wasm'
const MODEL_URL = '/mediapipe-wasm/hand_landmarker.task'

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

// ── Landmark-based palm line geometry ────────────────────────────────────────
//
// Computes anatomically correct bezier control points for the four classical
// palm lines using only MediaPipe 21-point hand skeleton positions.
// No pixel analysis, no canvas normalization, no edge detection.
//
// Returns start/control/end [x,y] triplets in canvas pixel coordinates,
// matching the [[x,y],[x,y],[x,y]] type consumed by drawLine().
//
// Landmark indices:
//   lm[0]=wrist  lm[1]=thumbCMC  lm[5]=indexMCP  lm[9]=midMCP
//   lm[13]=ringMCP  lm[17]=pinkyMCP

function computePalmLines(
  lm: NormalizedLandmark[],
  W: number,
  H: number,
): Record<'heart' | 'head' | 'life' | 'fate', [[number, number], [number, number], [number, number]]> {
  const p = (i: number): [number, number] => [lm[i].x * W, lm[i].y * H]
  const lerp = (a: [number,number], b: [number,number], t: number): [number,number] =>
    [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t]

  const wrist = p(0), thumbC = p(1), iMCP = p(5), mMCP = p(9), rMCP = p(13), pMCP = p(17)

  // Palm axis: wrist → middle MCP
  const ax = mMCP[0]-wrist[0], ay = mMCP[1]-wrist[1]
  const palmLen = Math.sqrt(ax*ax + ay*ay) || 1
  const axU: [number,number] = [ax/palmLen, ay/palmLen]   // unit along palm (toward fingers)
  const axP: [number,number] = [-axU[1], axU[0]]          // perpendicular (90° CCW)

  // Thumb-side detection: thumb CMC left of index MCP → thumb is on left of image
  const thumbSign = thumbC[0] < iMCP[0] ? -1 : 1          // +1 toward thumb via axP

  const mcpMid = lerp(rMCP, mMCP, 0.5)

  // ── Heart Line (distal transverse crease) ──────────────────────────────────
  // Horizontal arc from pinky side to index side, ~15% below the MCP row
  const hDrop = palmLen * 0.15
  const heart: [[number,number],[number,number],[number,number]] = [
    [pMCP[0]   + axU[0]*hDrop,        pMCP[1]   + axU[1]*hDrop],
    [mcpMid[0] + axU[0]*hDrop*1.25,   mcpMid[1] + axU[1]*hDrop*1.25],
    [iMCP[0]   + axU[0]*hDrop*0.85,   iMCP[1]   + axU[1]*hDrop*0.85],
  ]

  // ── Head Line (proximal transverse crease) ─────────────────────────────────
  // From thumb-index web toward ulnar (pinky) edge, ~40% from MCP row
  const headOrigin = lerp(thumbC, iMCP, 0.5)
  const hdDrop = palmLen * 0.40
  const head: [[number,number],[number,number],[number,number]] = [
    [headOrigin[0] + axU[0]*hdDrop,        headOrigin[1] + axU[1]*hdDrop],
    [mcpMid[0]    + axU[0]*hdDrop*1.05,   mcpMid[1]    + axU[1]*hdDrop*1.05],
    [pMCP[0]      + axU[0]*hdDrop*1.15,   pMCP[1]      + axU[1]*hdDrop*1.15],
  ]

  // ── Life Line (thenar arc) ─────────────────────────────────────────────────
  // Starts near head line origin, arcs around thumb base down to wrist
  const lifeOrigin = lerp(thumbC, iMCP, 0.35)
  const life: [[number,number],[number,number],[number,number]] = [
    [lifeOrigin[0] + axU[0]*palmLen*0.38, lifeOrigin[1] + axU[1]*palmLen*0.38],
    [wrist[0] + axU[0]*palmLen*0.55 + axP[0]*thumbSign*palmLen*0.28,
     wrist[1] + axU[1]*palmLen*0.55 + axP[1]*thumbSign*palmLen*0.28],
    [wrist[0] + axP[0]*thumbSign*palmLen*0.12, wrist[1] + axP[1]*thumbSign*palmLen*0.12],
  ]

  // ── Fate Line (central vertical) ──────────────────────────────────────────
  // From ~10% above wrist toward middle MCP, slight lateral drift at base
  const fate: [[number,number],[number,number],[number,number]] = [
    [wrist[0] + axU[0]*palmLen*0.12,  wrist[1] + axU[1]*palmLen*0.12],
    [wrist[0] + axU[0]*palmLen*0.45 + axP[0]*thumbSign*palmLen*0.06,
     wrist[1] + axU[1]*palmLen*0.45 + axP[1]*thumbSign*palmLen*0.06],
    [mMCP[0]  + axU[0]*palmLen*-0.25, mMCP[1]  + axU[1]*palmLen*-0.25],
  ]

  return { heart, head, life, fate }
}

function computeScores(lm: NormalizedLandmark[]): Record<string, number> {
  const palmH = Math.abs(lm[0].y - lm[9].y)
  const palmW = Math.abs(lm[5].x - lm[17].x)
  const ratio = palmH / (palmW || 0.01)
  return {
    heart: Math.round(65 + (lm[5].y - lm[17].y) * 80 + Math.random() * 8),
    head:  Math.round(70 + ratio * 12 + Math.random() * 8),
    life:  Math.round(68 + (1 - lm[1].x) * 60 + Math.random() * 8),
    fate:  Math.round(60 + Math.abs(lm[0].x - lm[9].x) * 90 + Math.random() * 8),
  }
}

// ── Canvas drawing ────────────────────────────────────────────────────────────

function drawLine(
  ctx: CanvasRenderingContext2D,
  pts: [[number, number], [number, number], [number, number]],
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
  ctx.lineWidth = 2.5
  ctx.globalAlpha = 0.92 * progress
  ctx.shadowColor = color
  ctx.shadowBlur = 10
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  // Tip dot when nearly complete
  if (progress > 0.85) {
    const t = 1
    const ex = (1-t)*(1-t)*start[0] + 2*(1-t)*t*ctrl[0] + t*t*end[0]
    const ey = (1-t)*(1-t)*start[1] + 2*(1-t)*t*ctrl[1] + t*t*end[1]
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

// ── Astroline-style hand guide overlay ───────────────────────────────────────
// Large solid-white hand silhouette that fills the camera frame so the user
// can easily align their palm. Mirrors for left-hand mode.

function HandGuideOverlay({ hand }: { hand: 'left' | 'right' }) {
  // All-bezier closed path — no L (straight line) or A (arc) segments.
  // Every finger side uses easing cubic beziers; every fingertip uses a
  // bezier pair for organic, slightly-tapered rounding (not a rigid semicircle).
  // Right-hand design. Left hand: CSS scaleX(-1).
  const d = [
    'M 22 496',
    'C 20 440 18 360 18 268',    // left palm edge

    // Pinky — tapered (base 52px wide, tip 44px)
    'C 18 244 19 228 22 213',    // left side ease-in
    'C 26 197 62 197 66 213',    // rounded tip
    'C 62 228 68 244 70 258',    // right side ease-out
    'C 72 286 80 286 82 258',    // valley → ring

    // Ring — tapered (base 50px, tip 38px)
    'C 82 216 83 183 86 150',    // left side
    'C 90 130 124 130 128 150',  // rounded tip
    'C 128 183 130 216 132 258', // right side
    'C 134 286 142 286 144 258', // valley → middle

    // Middle — tallest, tapered (base 54px, tip 46px)
    'C 144 196 145 152 148 110', // left side
    'C 152 88 190 88 194 110',   // rounded tip
    'C 194 152 197 196 198 258', // right side
    'C 200 286 208 286 210 258', // valley → index

    // Index — tapered (base 50px, tip 38px)
    'C 210 216 211 183 214 150', // left side
    'C 218 130 252 130 256 150', // rounded tip
    'C 256 183 258 216 260 272', // right side to palm

    // Thumb and right palm
    'C 260 340 262 358 264 368', // right palm to thumb junction
    'C 280 350 294 316 294 288', // thumb outer boundary
    'C 292 264 275 250 257 256', // around thumb tip
    'C 246 262 242 305 244 372', // thumb inner back down
    'C 244 448 243 472 242 494', // right palm down (curved)
    'C 196 510 88 510 22 496 Z', // wrist close
  ].join(' ')

  return (
    <motion.svg
      viewBox="0 0 300 540"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ transform: hand === 'left' ? 'scaleX(-1)' : undefined }}
      animate={{ opacity: [0.85, 1, 0.85] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d={d} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="20" strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="rgba(0,0,0,0.35)" stroke="white" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
    </motion.svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { hand: 'left' | 'right'; onClose: () => void }

export function PalmCameraScanner({ hand, onClose }: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const captureCanvas = useRef<HTMLCanvasElement>(null)   // for grabbing camera frame
  const overlayRef    = useRef<HTMLCanvasElement>(null)   // line-drawing overlay
  const landmarkerRef = useRef<unknown>(null)
  const rafRef        = useRef<number>(0)
  const streamRef     = useRef<MediaStream | null>(null)
  const isBackCamRef  = useRef(false)   // true when back (environment) camera is active

  const [phase, setPhase]               = useState<Phase>('intro')
  const [imageUrl, setImageUrl]         = useState<string | null>(null)
  // Store natural image size so the overlay canvas matches exactly
  const [imgSize, setImgSize]           = useState<{ w: number; h: number } | null>(null)
  const [errorMsg, setErrorMsg]         = useState('')
  const [drawnCount, setDrawnCount]     = useState(0)
  const [palmLines, setPalmLines]       = useState<PalmLine[]>(LINE_META)
  const [currentLine, setCurrentLine]   = useState(-1)
  const [landmarks, setLandmarks]       = useState<NormalizedLandmark[] | null>(null)
  const [isBackCam, setIsBackCam]       = useState(false)
  // ── Load model ──
  const loadModel = useCallback(async () => {
    if (landmarkerRef.current) return true
    try {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
      const buildLandmarker = (delegate: 'GPU' | 'CPU') =>
        HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'IMAGE',
          numHands: 1,
        })
      // Try GPU first; fall back to CPU if the device doesn't support WebGL/GPU delegate
      try {
        landmarkerRef.current = await buildLandmarker('GPU')
      } catch {
        console.warn('GPU delegate unavailable, falling back to CPU')
        landmarkerRef.current = await buildLandmarker('CPU')
      }
      return true
    } catch (err) {
      console.error('MediaPipe load error:', err)
      setErrorMsg('Failed to load detection model. Check your connection and try again.')
      setPhase('error')
      return false
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => () => { stopStream(); if (imageUrl) URL.revokeObjectURL(imageUrl) }, [])

  // ── Attach stream to <video> after camera phase renders it into the DOM ──
  // startCamera() obtains the stream while phase='loading-model' (before the <video> tag
  // exists). We store the stream in streamRef and then setPhase('camera') which renders
  // the video element. This effect runs after that render and sets srcObject.
  useEffect(() => {
    if (phase !== 'camera') return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {})
  }, [phase])

  // ── Run detection on an HTMLImageElement or HTMLCanvasElement ──
  const runDetection = useCallback(async (src: HTMLImageElement | HTMLCanvasElement) => {
    setPhase('scanning')
    await new Promise((r) => setTimeout(r, 1800)) // scan animation plays

    try {
      const lm = landmarkerRef.current as {
        detect: (s: HTMLImageElement | HTMLCanvasElement) => { landmarks: NormalizedLandmark[][] }
      }
      const result = lm.detect(src)

      if (!result.landmarks.length) {
        setErrorMsg('No hand detected. Try a clearer photo: palm flat, fingers spread, good lighting.')
        setPhase('error')
        return
      }

      const pts = result.landmarks[0]
      setLandmarks(pts)

      const scores = computeScores(pts)
      setPalmLines((prev) =>
        prev.map((l) => ({ ...l, score: Math.min(99, Math.max(55, scores[l.id] ?? 70)) })),
      )

      setPhase('drawing')
    } catch (err) {
      console.error('Detection error:', err)
      setErrorMsg('Detection failed. Please try again with a clearer palm photo.')
      setPhase('error')
    }
  }, [])

  // ── Open camera ──
  const startCamera = useCallback(async () => {
    setPhase('loading-model')
    if (!await loadModel()) return

    // Back camera first (no mirroring needed), fallback to front/any for desktop.
    const videoConstraints: Array<{ video: MediaTrackConstraints; isBack: boolean }> = [
      { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, isBack: true },
      { video: { facingMode: 'environment',            width: { ideal: 1280 }, height: { ideal: 720 } }, isBack: true },
      { video: { facingMode: 'user',                   width: { ideal: 1280 }, height: { ideal: 720 } }, isBack: false },
      { video: {                                        width: { ideal: 1280 }, height: { ideal: 720 } }, isBack: false },
    ]

    let stream: MediaStream | null = null
    let isBack = false
    for (const { video, isBack: b } of videoConstraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video })
        isBack = b
        break
      } catch { /* try next constraint */ }
    }
    isBackCamRef.current = isBack
    setIsBackCam(isBack)

    if (!stream) {
      setErrorMsg('Camera access denied. Please grant permission or upload a photo instead.')
      setPhase('error')
      return
    }

    streamRef.current = stream
    // NOTE: the <video> element is only rendered in 'camera' phase.
    // We set srcObject via a useEffect that fires after the video mounts.
    setPhase('camera')
  }, [loadModel])

  // ── Upload photo ──
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setPhase('loading-model')
    if (!await loadModel()) return

    const url = URL.createObjectURL(file)
    setImageUrl(url)

    // Load image to get natural dimensions + run detection
    const img = new window.Image()
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
      runDetection(img)
    }
    img.src = url
  }, [loadModel, runDetection])

  // ── Capture from camera ──
  const captureFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = captureCanvas.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.save()
    if (!isBackCamRef.current) {
      // Front camera is displayed mirrored (scaleX(-1)) — counter-mirror the capture
      // so MediaPipe sees the real (non-flipped) hand orientation.
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    ctx.restore()

    stopStream()

    const url = canvas.toDataURL('image/jpeg', 0.92)
    setImageUrl(url)
    setImgSize({ w: canvas.width, h: canvas.height })
    await runDetection(canvas)
  }, [stopStream, runDetection])

  // ── Animate palm lines onto canvas when phase = drawing ──
  // The canvas is already mounted (inside the persistent image container that renders
  // during 'scanning'), so no need for a RAF wrapper — just access it directly.
  useEffect(() => {
    if (phase !== 'drawing' || !landmarks || !imgSize) return

    const canvas = overlayRef.current
    if (!canvas) return

    // Size canvas to match the natural image dimensions exactly
    canvas.width  = imgSize.w
    canvas.height = imgSize.h
    const ctx = canvas.getContext('2d')!

    // Compute palm line geometry purely from landmark positions
    const palmPts = computePalmLines(landmarks, imgSize.w, imgSize.h)
    let lineIdx  = 0
    let startTs: number | null = null
    const DURATION = 1400 // ms per line

    setCurrentLine(0)
    setDrawnCount(0)

    const animate = (ts: number) => {
      if (!startTs) startTs = ts
      const progress = Math.min((ts - startTs) / DURATION, 1)

      ctx.clearRect(0, 0, imgSize.w, imgSize.h)

      // All completed lines at full opacity
      for (let i = 0; i < lineIdx; i++) {
        const id = LINE_ORDER[i]
        drawLine(ctx, palmPts[id], LINE_COLORS[id], 1)
      }

      // Current line animating in
      const currentId = LINE_ORDER[lineIdx]
      drawLine(ctx, palmPts[currentId], LINE_COLORS[currentId], progress)

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
          // All lines drawn — transition to results (canvas stays mounted, lines persist)
          setCurrentLine(-1)
          setTimeout(() => setPhase('results'), 600)
        }
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => { cancelAnimationFrame(rafRef.current) }
  }, [phase, landmarks, imgSize])

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
    setLandmarks(null)
    setPalmLines(LINE_META)
  }, [stopStream, imageUrl])

  // ── Helpers ──
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // Full-screen backdrop
    <div className="fixed inset-0 z-50 flex justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
    {/* Mobile-width scanner panel — matches the app's mobile frame width */}
    <div
      className="w-full max-w-[430px] h-full flex flex-col"
      style={{ background: 'rgba(6,13,27,0.97)', backdropFilter: 'blur(20px)' }}
    >
      {/* Header */}
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

      {/* ── CAMERA PHASE: full-screen, no scroll, no max-width constraint ── */}
      {phase === 'camera' && (
        <motion.div
          key="camera-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 relative overflow-hidden bg-black"
        >
          {/* Full-bleed video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: isBackCam ? undefined : 'scaleX(-1)' }}
          />
          {/* Hidden capture canvas */}
          <canvas ref={captureCanvas} className="hidden" />

          {/* Large Astroline-style hand silhouette */}
          <HandGuideOverlay hand={hand} />

          {/* Upload shortcut (top-right, near close button area) */}
          <button
            onClick={openFilePicker}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/80"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            <Upload size={13} />
            Upload
          </button>

          {/* Bottom: instruction label + capture button */}
          <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-5">
            <p
              className="text-sm text-white font-medium px-5 py-2 rounded-2xl text-center max-w-[260px] leading-snug"
              style={{ background: 'rgba(0,0,0,0.62)' }}
            >
              Place your palm inside the outline and take a photo.
            </p>
            <motion.button
              onClick={captureFrame}
              whileTap={{ scale: 0.93 }}
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
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

      {/* ── ALL OTHER PHASES: scrollable, max-width constrained ── */}
      {phase !== 'camera' && (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto w-full">
          <AnimatePresence mode="wait">

            {/* ── INTRO ── */}
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
                    AI detects your hand landmarks and traces heart, head, life &amp; fate lines.
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
                    'Spread fingers slightly, palm facing up',
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

            {/* ── LOADING MODEL ── */}
            {phase === 'loading-model' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center"
              >
                <motion.div
                  className="w-14 h-14 rounded-full border-2 border-rose-500/30 border-t-rose-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="text-white font-semibold">Loading AI Model…</p>
                <p className="text-slate-500 text-xs">First-time download ~8 MB, cached after</p>
              </motion.div>
            )}

            {/* ── ERROR ── */}
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

          {/* ── IMAGE PHASES: scanning / drawing / results ────────────────────────
              All three phases share ONE persistent container so <canvas ref={overlayRef}>
              is mounted during 'scanning' and stays in the DOM through 'drawing' and
              'results'. This means overlayRef.current is never null when the drawing
              animation effect fires — the AnimatePresence mode="wait" timing race
              cannot happen here.
          ──────────────────────────────────────────────────────────────────────── */}
          {imageUrl && (phase === 'scanning' || phase === 'drawing' || phase === 'results') && (
            <div className="flex flex-col gap-4 px-4 py-5">
              <div className="relative w-full rounded-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Palm"
                  className="w-full object-cover"
                  style={{ aspectRatio: '4/3' }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: phase === 'scanning' ? 'rgba(6,13,27,0.5)' : 'rgba(6,13,27,0.3)' }}
                />

                {/* Canvas — always mounted while image is visible, lines persist across phases */}
                <canvas
                  ref={overlayRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* ── Scanning: sweep beam + brackets + label ── */}
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
                        className="text-xs text-rose-300 px-3 py-1 rounded-full font-mono"
                        style={{ background: 'rgba(0,0,0,0.7)' }}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        Detecting hand landmarks…
                      </motion.span>
                    </div>
                  </>
                )}

                {/* ── Drawing + Results: completed line tags ── */}
                {(phase === 'drawing' || phase === 'results') && (
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                    {LINE_META.slice(0, drawnCount).map((l) => (
                      <motion.div
                        key={l.id}
                        initial={{ x: 24, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: `${l.color}18`, border: `1px solid ${l.color}40`, color: l.color }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                        {l.label}
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* ── Drawing: current line label ── */}
                {phase === 'drawing' && currentLine >= 0 && (
                  <motion.div
                    className="absolute bottom-3 inset-x-0 flex justify-center"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                  >
                    <span
                      className="text-[11px] px-3 py-1 rounded-full font-mono"
                      style={{ background: 'rgba(0,0,0,0.75)', color: LINE_META[currentLine]?.color }}
                    >
                      Tracing {LINE_META[currentLine]?.label}…
                    </span>
                  </motion.div>
                )}

                {/* ── Results: done badge ── */}
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

              {/* ── Results: score cards + scan-again ── */}
              {phase === 'results' && (
                <>
                  <div className="space-y-2.5">
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
                  </div>
                  <div className="pb-4">
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-400"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <RotateCcw size={14} />
                      Scan Again
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
    </div>
  )
}
