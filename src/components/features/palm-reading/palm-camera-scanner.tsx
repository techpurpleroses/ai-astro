'use client'

/**
 * PalmCameraScanner
 *
 * Captures a palm photo (camera or upload), sends it to /api/palm/scan,
 * receives normalized line coordinates and interpreted scores, and
 * animates the four classical palm lines (heart / head / life / fate)
 * on a canvas overlay.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, RotateCcw, X, CheckCircle, AlertCircle, Hand, Flashlight, FlashlightOff } from 'lucide-react'
import Image from 'next/image'
import type { PalmScanRecord } from '@/lib/palm/contracts'

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'camera' | 'scanning' | 'drawing' | 'results' | 'error'

type Pt = [number, number]
type LinePts = Pt[]

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
type LineId = (typeof LINE_ORDER)[number]
const LINE_META_BY_ID: Record<LineId, PalmLine> = {
  heart: LINE_META[0],
  head: LINE_META[1],
  life: LINE_META[2],
  fate: LINE_META[3],
}
const PALM_DEBUG = process.env.NEXT_PUBLIC_PALM_DEBUG !== '0'
const UPLOAD_MAX_DIMENSION = 1600
const UPLOAD_TARGET_BYTES = 1_400_000
const UPLOAD_MIN_QUALITY = 0.62
const MEDIAPIPE_WASM_ROOT = '/mediapipe-wasm'
const MEDIAPIPE_HAND_MODEL = '/mediapipe-wasm/hand_landmarker.task'
const MEDIAPIPE_MIN_COVERAGE = 0.11
const MEDIAPIPE_MIN_HEIGHT_RATIO = 0.42
const MEDIAPIPE_MIN_SPREAD = 0.12
const MEDIAPIPE_MIN_BRIGHTNESS = 60
const MEDIAPIPE_MIN_CONTRAST = 24
const MEDIAPIPE_MIN_SHARPNESS = 10
const TIP_INDEXES = [8, 12, 16, 20] as const

type PalmScanApiPayload = Partial<PalmScanRecord> & {
  error?: string
  details?: { reason?: string }
}

interface ProcessedImage {
  dataUrl: string
  width: number
  height: number
}

interface LandmarkPoint {
  x: number
  y: number
}

interface MpHandLandmarkerResult {
  landmarks?: LandmarkPoint[][]
  handednesses?: Array<Array<{ categoryName?: string; score?: number }>>
}

interface MpHandLandmarker {
  detect: (image: HTMLImageElement) => MpHandLandmarkerResult
}

interface PalmCropRect {
  x: number
  y: number
  w: number
  h: number
}

interface PalmImageQuality {
  brightness: number
  contrast: number
  sharpness: number
}

interface MediaPipePrepResult {
  status: 'ok' | 'blocked' | 'unavailable'
  processed: ProcessedImage
  issues: string[]
  coverage: number
  spread: number
  quality: PalmImageQuality
  message?: string
}

let handLandmarkerPromise: Promise<MpHandLandmarker | null> | null = null

function logScan(step: string, data?: Record<string, unknown>) {
  if (!PALM_DEBUG) return
  if (data) {
    console.log(`[PalmCameraScanner] ${step}`, data)
    return
  }
  console.log(`[PalmCameraScanner] ${step}`)
}

function getOrCreatePalmClientId() {
  const key = 'astroai_palm_client_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.localStorage.setItem(key, created)
  return created
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('file_read_failed'))
    reader.onload = () => {
      const value = reader.result
      if (typeof value !== 'string') {
        reject(new Error('invalid_file_data'))
        return
      }
      resolve(value)
    }
    reader.readAsDataURL(file)
  })
}

function estimateDataUrlBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return dataUrl.length
  const base64Length = dataUrl.length - comma - 1
  return Math.floor((base64Length * 3) / 4)
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image_decode_failed'))
    img.src = dataUrl
  })
}

async function optimizeImageDataUrl(
  dataUrl: string,
  options?: { maxDimension?: number; targetBytes?: number; minQuality?: number; initialQuality?: number },
) {
  const maxDimension = options?.maxDimension ?? UPLOAD_MAX_DIMENSION
  const targetBytes = options?.targetBytes ?? UPLOAD_TARGET_BYTES
  const minQuality = options?.minQuality ?? UPLOAD_MIN_QUALITY
  let quality = options?.initialQuality ?? 0.88

  const img = await loadImageFromDataUrl(dataUrl)
  const ratio = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * ratio))
  const height = Math.max(1, Math.round(img.naturalHeight * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')
  ctx.drawImage(img, 0, 0, width, height)

  let best = canvas.toDataURL('image/jpeg', quality)
  let bestBytes = estimateDataUrlBytes(best)
  while (bestBytes > targetBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.08)
    const candidate = canvas.toDataURL('image/jpeg', quality)
    best = candidate
    bestBytes = estimateDataUrlBytes(candidate)
  }

  return {
    dataUrl: best,
    width,
    height,
    quality,
    bytes: bestBytes,
  }
}

async function enhancePalmImageDataUrl(input: ProcessedImage): Promise<ProcessedImage> {
  const img = await loadImageFromDataUrl(input.dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = input.width
  canvas.height = input.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')
  ctx.filter = 'brightness(1.24) contrast(1.2) saturate(1.08)'
  ctx.drawImage(img, 0, 0, input.width, input.height)

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    width: input.width,
    height: input.height,
  }
}

function distance(a: LandmarkPoint, b: LandmarkPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function buildPalmCropRect(
  box: { minX: number; maxX: number; minY: number; maxY: number },
  imgW: number,
  imgH: number,
) {
  const boxW = box.maxX - box.minX
  const boxH = box.maxY - box.minY
  const padX = boxW * 0.28
  const padTop = boxH * 0.2
  const padBottom = boxH * 0.24

  let minX = clamp01(box.minX - padX)
  let maxX = clamp01(box.maxX + padX)
  let minY = clamp01(box.minY - padTop)
  let maxY = clamp01(box.maxY + padBottom)

  const targetRatio = 0.76
  let w = Math.max(0.05, maxX - minX)
  let h = Math.max(0.05, maxY - minY)
  const ratio = w / h

  if (ratio > targetRatio) {
    const desiredH = w / targetRatio
    const delta = desiredH - h
    minY -= delta * 0.35
    maxY += delta * 0.65
  } else {
    const desiredW = h * targetRatio
    const delta = desiredW - w
    minX -= delta / 2
    maxX += delta / 2
  }

  minX = clamp01(minX)
  maxX = clamp01(maxX)
  minY = clamp01(minY)
  maxY = clamp01(maxY)

  w = Math.max(1 / imgW, maxX - minX)
  h = Math.max(1 / imgH, maxY - minY)

  return {
    x: Math.max(0, Math.round(minX * imgW)),
    y: Math.max(0, Math.round(minY * imgH)),
    w: Math.max(1, Math.round(w * imgW)),
    h: Math.max(1, Math.round(h * imgH)),
  } as PalmCropRect
}

function cropImageToDataUrl(image: HTMLImageElement, rect: PalmCropRect): ProcessedImage {
  const canvas = document.createElement('canvas')
  canvas.width = rect.w
  canvas.height = rect.h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')

  ctx.drawImage(
    image,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    0,
    0,
    rect.w,
    rect.h,
  )

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    width: rect.w,
    height: rect.h,
  }
}

function measurePalmQuality(image: HTMLImageElement, rect: PalmCropRect): PalmImageQuality {
  const sampleCanvas = document.createElement('canvas')
  const sampleMax = 220
  const scale = Math.min(1, sampleMax / Math.max(rect.w, rect.h))
  sampleCanvas.width = Math.max(32, Math.round(rect.w * scale))
  sampleCanvas.height = Math.max(32, Math.round(rect.h * scale))
  const ctx = sampleCanvas.getContext('2d')
  if (!ctx) {
    return { brightness: 0, contrast: 0, sharpness: 0 }
  }

  ctx.drawImage(
    image,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height,
  )

  const { data, width, height } = ctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height)
  const luminance = new Float32Array(width * height)

  let sum = 0
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const l = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722
    luminance[p] = l
    sum += l
  }

  const count = luminance.length
  const mean = count ? sum / count : 0
  let variance = 0
  for (let i = 0; i < count; i++) {
    const d = luminance[i] - mean
    variance += d * d
  }
  const contrast = count ? Math.sqrt(variance / count) : 0

  let laplacianEnergy = 0
  let lapCount = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x
      const v = luminance[p]
      const lap =
        (4 * v) -
        luminance[p - 1] -
        luminance[p + 1] -
        luminance[p - width] -
        luminance[p + width]
      laplacianEnergy += lap * lap
      lapCount += 1
    }
  }
  const sharpness = lapCount ? Math.sqrt(laplacianEnergy / lapCount) : 0
  return {
    brightness: Number(mean.toFixed(1)),
    contrast: Number(contrast.toFixed(1)),
    sharpness: Number(sharpness.toFixed(1)),
  }
}

async function getHandLandmarker() {
  if (handLandmarkerPromise) return handLandmarkerPromise
  handLandmarkerPromise = (async () => {
    try {
      const vision = await import('@mediapipe/tasks-vision')
      const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT)
      try {
        const gpu = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MEDIAPIPE_HAND_MODEL,
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          numHands: 1,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        })
        return gpu as MpHandLandmarker
      } catch {
        const cpu = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MEDIAPIPE_HAND_MODEL },
          runningMode: 'IMAGE',
          numHands: 1,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        })
        return cpu as MpHandLandmarker
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('[PalmCameraScanner] mediapipe.init.failed', message)
      return null
    }
  })()
  return handLandmarkerPromise
}

function prepFailureMessage(issues: string[]) {
  if (issues.includes('too_small')) {
    return 'Move your hand closer so the palm fills most of the frame.'
  }
  if (issues.includes('low_light')) {
    return 'Lighting is too low for reliable scanning. Turn on flash or move to better light.'
  }
  if (issues.includes('blur')) {
    return 'Image is blurry. Hold still and retake the photo.'
  }
  return 'Palm pre-check failed. Reposition your hand and try again.'
}

async function prepPalmImageWithMediaPipe(input: ProcessedImage): Promise<MediaPipePrepResult> {
  const landmarker = await getHandLandmarker()
  if (!landmarker) {
    return {
      status: 'unavailable',
      processed: input,
      issues: ['mediapipe_unavailable'],
      coverage: 0,
      spread: 0,
      quality: { brightness: 0, contrast: 0, sharpness: 0 },
    }
  }

  const img = await loadImageFromDataUrl(input.dataUrl)
  const result = landmarker.detect(img)
  const points = result.landmarks?.[0]
  if (!points || points.length < 5) {
    return {
      status: 'blocked',
      processed: input,
      issues: ['no_hand'],
      coverage: 0,
      spread: 0,
      quality: { brightness: 0, contrast: 0, sharpness: 0 },
      message: 'No hand detected in frame. Keep full palm visible and try again.',
    }
  }

  const xs = points.map((p) => clamp01(p.x))
  const ys = points.map((p) => clamp01(p.y))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const boxW = Math.max(0.0001, maxX - minX)
  const boxH = Math.max(0.0001, maxY - minY)
  const coverage = boxW * boxH

  let spread = 0
  for (let i = 0; i < TIP_INDEXES.length - 1; i++) {
    const a = points[TIP_INDEXES[i]]
    const b = points[TIP_INDEXES[i + 1]]
    spread += distance(a, b)
  }
  spread /= Math.max(1, TIP_INDEXES.length - 1)
  spread /= Math.max(0.0001, boxW)

  const cropRect = buildPalmCropRect({ minX, maxX, minY, maxY }, input.width, input.height)
  const quality = measurePalmQuality(img, cropRect)
  const cropped = cropImageToDataUrl(img, cropRect)

  const issues: string[] = []
  if (coverage < MEDIAPIPE_MIN_COVERAGE || boxH < MEDIAPIPE_MIN_HEIGHT_RATIO) issues.push('too_small')
  if (spread < MEDIAPIPE_MIN_SPREAD) issues.push('fingers_closed')
  if (quality.brightness < MEDIAPIPE_MIN_BRIGHTNESS) issues.push('low_light')
  if (quality.contrast < MEDIAPIPE_MIN_CONTRAST) issues.push('low_contrast')
  if (quality.sharpness < MEDIAPIPE_MIN_SHARPNESS) issues.push('blur')

  const blocked = issues.includes('too_small') || issues.includes('low_light') || issues.includes('blur')
  return {
    status: blocked ? 'blocked' : 'ok',
    processed: cropped,
    issues,
    coverage: Number(coverage.toFixed(3)),
    spread: Number(spread.toFixed(3)),
    quality,
    message: blocked ? prepFailureMessage(issues) : undefined,
  }
}

function errorMessageForScanFailure(
  status: number,
  apiError?: string,
  reason?: string,
  rawBody?: string,
) {
  if (status === 413 || rawBody?.includes('FUNCTION_PAYLOAD_TOO_LARGE')) {
    return 'Photo is too large for server upload. Move closer and try again.'
  }

  if (apiError === 'no_palm') {
    const suffix = reason ? ` (${reason})` : ''
    return `No palm detected${suffix}. Improve lighting, turn on flash, and keep full palm in frame.`
  }

  if (reason === 'roboflow_api_key_missing') {
    return 'Palm scanner is not configured on server. Add ROBOFLOW_API_KEY in Vercel.'
  }
  if (reason === 'roboflow_auth_failed') {
    return 'Palm detection auth failed on server. Check Roboflow API key.'
  }
  if (reason === 'roboflow_rate_limited') {
    return 'Palm detection service is rate-limited. Try again in a moment.'
  }
  if (reason === 'detector_timeout') {
    return 'Palm detection timed out. Try a clearer photo with better lighting.'
  }
  if (status >= 500) {
    return 'Server error during palm scan. Check Vercel function logs.'
  }
  return 'Analysis failed. Check your connection and try again.'
}

function detectedLineOrder(lines: DetectedLines): LineId[] {
  const order = LINE_ORDER.filter((id) => lines[id].length >= 2)
  return order.length ? order : ['heart', 'head', 'life']
}

// ── Canvas drawing ────────────────────────────────────────────────────────────

function drawLine(
  ctx: CanvasRenderingContext2D,
  pts: LinePts,
  color: string,
  progress: number,
) {
  if (pts.length < 2) return

  const segmentLengths: number[] = []
  let totalLength = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0]
    const dy = pts[i + 1][1] - pts[i][1]
    const length = Math.sqrt(dx * dx + dy * dy)
    segmentLengths.push(length)
    totalLength += length
  }
  if (totalLength <= 0) return

  const targetLength = totalLength * progress

  const drawPartialPath = () => {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    let travelled = 0

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const segLen = segmentLengths[i]
      const nextTravelled = travelled + segLen

      if (targetLength >= nextTravelled) {
        ctx.lineTo(b[0], b[1])
      } else {
        const remain = Math.max(0, targetLength - travelled)
        const t = segLen > 0 ? remain / segLen : 0
        const x = a[0] + (b[0] - a[0]) * t
        const y = a[1] + (b[1] - a[1]) * t
        ctx.lineTo(x, y)
        break
      }
      travelled = nextTravelled
    }
  }

  const tipPoint = () => {
    let travelled = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const segLen = segmentLengths[i]
      const nextTravelled = travelled + segLen
      if (targetLength <= nextTravelled) {
        const remain = Math.max(0, targetLength - travelled)
        const t = segLen > 0 ? remain / segLen : 0
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as Pt
      }
      travelled = nextTravelled
    }
    return pts[pts.length - 1]
  }

  // Glow layer
  ctx.save()
  drawPartialPath()
  ctx.strokeStyle = color
  ctx.lineWidth = 9
  ctx.globalAlpha = 0.12 * progress
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  // Dark under-stroke keeps colored line crisp on bright skin/glare
  ctx.save()
  drawPartialPath()
  ctx.strokeStyle = 'rgba(3, 8, 18, 0.5)'
  ctx.lineWidth = 6.5
  ctx.globalAlpha = 0.9 * progress
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  // Main line
  ctx.save()
  drawPartialPath()
  ctx.strokeStyle = color
  ctx.lineWidth = 4.2
  ctx.globalAlpha = 0.95 * progress
  ctx.shadowColor = color
  ctx.shadowBlur = 5
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  // Tip dot when nearly complete
  if (progress > 0.85) {
    const [ex, ey] = tipPoint()
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
        strokeWidth={0.65}
        color="rgba(255,255,255,0.78)"
        style={{
          width: 'min(108vw, 620px)',
          height: 'min(94dvh, 860px)',
          // Lucide Hand icon is a left hand by default; flip for right
          transform: hand === 'right' ? 'scaleX(-1)' : undefined,
          filter: 'drop-shadow(0 0 22px rgba(255,255,255,0.48))',
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
  const imageViewportRef = useRef<HTMLDivElement>(null)
  const rafRef        = useRef<number>(0)
  const streamRef     = useRef<MediaStream | null>(null)
  const isBackCamRef  = useRef(false)
  const clientIdRef   = useRef('')

  const [phase, setPhase]             = useState<Phase>('intro')
  const [imageUrl, setImageUrl]       = useState<string | null>(null)
  const [imgSize, setImgSize]         = useState<{ w: number; h: number } | null>(null)
  const [errorMsg, setErrorMsg]       = useState('')
  const [drawnCount, setDrawnCount]   = useState(0)
  const [palmLines, setPalmLines]     = useState<PalmLine[]>(LINE_META)
  const [currentLine, setCurrentLine] = useState(-1)
  const [lineOrder, setLineOrder] = useState<LineId[]>(LINE_ORDER)
  const [detectedLines, setDetectedLines] = useState<DetectedLines | null>(null)
  const [isBackCam, setIsBackCam]     = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchBusy, setTorchBusy] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setTorchSupported(false)
    setTorchOn(false)
    setTorchBusy(false)
    cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    clientIdRef.current = getOrCreatePalmClientId()
  }, [])

  useEffect(() => () => {
    stopStream()
    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
  }, [imageUrl, stopStream])

  // Attach stream to <video> after camera phase mounts the element
  useEffect(() => {
    if (phase !== 'camera') return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {})
  }, [phase])

  // Call server palm scan pipeline
  const analyzeImage = useCallback(async (dataUrl: string, w: number, h: number) => {
    setPhase('scanning')
    const startedAt = performance.now()
    logScan('analyze.start', { hand, width: w, height: h, imageChars: dataUrl.length })

    let payload: ProcessedImage = { dataUrl, width: w, height: h }
    let enhancedRetried = false

    try {
      for (;;) {
        const res = await fetch('/api/palm/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: payload.dataUrl,
            side: hand,
            clientId: clientIdRef.current || getOrCreatePalmClientId(),
            imageWidth: payload.width,
            imageHeight: payload.height,
          }),
        })

        const bodyText = await res.text()
        const parsed = parseJsonSafe(bodyText)
        const data = (parsed && typeof parsed === 'object' ? parsed : {}) as PalmScanApiPayload
        const apiError = typeof data.error === 'string' ? data.error : undefined
        const reason = typeof data.details?.reason === 'string' ? data.details.reason : undefined
        logScan('analyze.response', {
          status: res.status,
          ok: res.ok,
          ms: Math.round(performance.now() - startedAt),
          error: apiError ?? 'none',
          reason: reason ?? 'none',
          bodyChars: bodyText.length,
          enhancedRetried,
        })

        const canRetryEnhanced =
          !enhancedRetried &&
          apiError === 'no_palm' &&
          (reason === 'no_predictions' || reason === 'major_lines_missing')

        if (canRetryEnhanced) {
          logScan('analyze.retry_enhanced.start', { reason, imageChars: payload.dataUrl.length })
          payload = await enhancePalmImageDataUrl(payload)
          enhancedRetried = true
          logScan('analyze.retry_enhanced.ready', { imageChars: payload.dataUrl.length })
          continue
        }

        if (!res.ok || apiError || !data.detect?.lines || !data.interpret?.core) {
          setErrorMsg(errorMessageForScanFailure(res.status, apiError, reason, bodyText))
          logScan('analyze.no_palm_or_error', {
            status: res.status,
            reason: reason || apiError || 'unknown',
            preview: bodyText.slice(0, 160),
          })
          setPhase('error')
          return
        }

        const detected = data.detect.lines
        const lines: DetectedLines = {
          heart: detected.heart as LinePts,
          head: detected.head as LinePts,
          life: detected.life as LinePts,
          fate: detected.fate as LinePts,
        }
        setDetectedLines(lines)
        const order = detectedLineOrder(lines)
        setLineOrder(order)

        setPalmLines(LINE_META.map((line) => ({
          ...line,
          score: data.interpret!.core.lineScore[line.id],
          trait: data.interpret!.core.lineSuggestion[line.id],
        })))

        setCurrentLine(0)
        setDrawnCount(0)
        setPhase('drawing')
        logScan('analyze.success', {
          ms: Math.round(performance.now() - startedAt),
          model: data.detect!.model,
          scores: data.interpret!.core.lineScore,
          enhancedRetried,
          detectedCount: order.length,
        })
        return
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMsg('Request failed before server response. Please try again.')
      setPhase('error')
      logScan('analyze.exception', { message })
    }
  }, [hand])

  // ── Open camera ──
  const preprocessPalmImage = useCallback(async (
    input: ProcessedImage,
    source: 'camera' | 'upload',
  ): Promise<ProcessedImage | null> => {
    const prep = await prepPalmImageWithMediaPipe(input)
    logScan('mediapipe.precheck', {
      source,
      status: prep.status,
      issues: prep.issues,
      coverage: prep.coverage,
      spread: prep.spread,
      brightness: prep.quality.brightness,
      contrast: prep.quality.contrast,
      sharpness: prep.quality.sharpness,
      outputWidth: prep.processed.width,
      outputHeight: prep.processed.height,
    })

    if (prep.status === 'blocked') {
      setErrorMsg(prep.message ?? 'Palm pre-check failed. Retake with better framing and lighting.')
      setPhase('error')
      return null
    }

    let prepared = prep.processed
    if (prep.issues.includes('low_contrast')) {
      prepared = await enhancePalmImageDataUrl(prepared)
      logScan('mediapipe.precheck.enhanced', {
        source,
        width: prepared.width,
        height: prepared.height,
      })
    }

    return prepared
  }, [])

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
    const track = stream.getVideoTracks()[0]
    if (track && isBack) {
      const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
      const supportsTorch = Boolean(caps?.torch)
      setTorchSupported(supportsTorch)
      setTorchOn(false)
    } else {
      setTorchSupported(false)
      setTorchOn(false)
    }
    setPhase('camera')
    void getHandLandmarker().then((landmarker) => {
      logScan('mediapipe.warmup', { available: Boolean(landmarker) })
    })
  }, [])

  const toggleTorch = useCallback(async () => {
    if (torchBusy) return
    const track = streamRef.current?.getVideoTracks?.()[0]
    if (!track) return
    const next = !torchOn

    setTorchBusy(true)
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet & { torch?: boolean }],
      })
      setTorchOn(next)
      logScan('torch.toggle', { on: next })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logScan('torch.toggle.fail', { message })
    } finally {
      setTorchBusy(false)
    }
  }, [torchBusy, torchOn])

  // ── Upload photo ──
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    try {
      const sourceDataUrl = await fileToDataUrl(file)
      const optimized = await optimizeImageDataUrl(sourceDataUrl)
      logScan('image.optimized', {
        source: 'upload',
        width: optimized.width,
        height: optimized.height,
        bytes: optimized.bytes,
        quality: optimized.quality,
      })
      const prepared = await preprocessPalmImage({
        dataUrl: optimized.dataUrl,
        width: optimized.width,
        height: optimized.height,
      }, 'upload')
      if (!prepared) return

      setImageUrl(prepared.dataUrl)
      setImgSize({ w: prepared.width, h: prepared.height })
      await analyzeImage(prepared.dataUrl, prepared.width, prepared.height)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMsg('Failed to process selected image.')
      setPhase('error')
      logScan('upload.process.fail', { message })
    }
  }, [analyzeImage, preprocessPalmImage])

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

    try {
      const captured = canvas.toDataURL('image/jpeg', 0.92)
      const optimized = await optimizeImageDataUrl(captured, {
        maxDimension: 1440,
        targetBytes: 1_200_000,
        initialQuality: 0.86,
      })
      logScan('image.optimized', {
        source: 'camera',
        width: optimized.width,
        height: optimized.height,
        bytes: optimized.bytes,
        quality: optimized.quality,
      })
      const prepared = await preprocessPalmImage({
        dataUrl: optimized.dataUrl,
        width: optimized.width,
        height: optimized.height,
      }, 'camera')
      if (!prepared) return

      setImageUrl(prepared.dataUrl)
      setImgSize({ w: prepared.width, h: prepared.height })
      await analyzeImage(prepared.dataUrl, prepared.width, prepared.height)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMsg('Failed to process captured image.')
      setPhase('error')
      logScan('capture.process.fail', { message })
    }
  }, [stopStream, analyzeImage, preprocessPalmImage])

  // ── Animate lines onto canvas when phase = drawing ──
  useEffect(() => {
    if (phase !== 'drawing' || !detectedLines || !imgSize) return
    const canvas = overlayRef.current
    const viewport = imageViewportRef.current
    if (!canvas) return
    if (!viewport) return

    const viewportW = Math.max(1, viewport.clientWidth)
    const viewportH = Math.max(1, viewport.clientHeight)
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewportW * dpr)
    canvas.height = Math.floor(viewportH * dpr)
    canvas.style.width = `${viewportW}px`
    canvas.style.height = `${viewportH}px`
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const activeOrder = lineOrder.length ? lineOrder : LINE_ORDER

    let lineIdx = 0
    let startTs: number | null = null
    const DURATION = 1400

    const mapToViewport = (pts: LinePts): LinePts => {
      const scale = Math.min(viewportW / imgSize.w, viewportH / imgSize.h)
      const drawW = imgSize.w * scale
      const drawH = imgSize.h * scale
      const offsetX = (viewportW - drawW) / 2
      const offsetY = (viewportH - drawH) / 2
      return pts.map(([x, y]) => [offsetX + x * drawW, offsetY + y * drawH] as Pt)
    }

    const animate = (ts: number) => {
      if (!startTs) startTs = ts
      const progress = Math.min((ts - startTs) / DURATION, 1)

      ctx.clearRect(0, 0, viewportW, viewportH)

      const mappedLines: DetectedLines = {
        heart: mapToViewport(detectedLines.heart),
        head: mapToViewport(detectedLines.head),
        life: mapToViewport(detectedLines.life),
        fate: mapToViewport(detectedLines.fate),
      }

      for (let i = 0; i < lineIdx; i++) {
        const id = activeOrder[i]
        drawLine(ctx, mappedLines[id], LINE_COLORS[id], 1)
      }

      const currentId = activeOrder[lineIdx]
      drawLine(ctx, mappedLines[currentId], LINE_COLORS[currentId], progress)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        const nextIdx = lineIdx + 1
        setDrawnCount(nextIdx)
        if (nextIdx < activeOrder.length) {
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
  }, [phase, detectedLines, imgSize, lineOrder])

  // Keep overlay aligned after layout changes in results phase.
  useEffect(() => {
    if (phase !== 'results' || !detectedLines || !imgSize) return
    const canvas = overlayRef.current
    const viewport = imageViewportRef.current
    if (!canvas || !viewport) return

    const activeOrder = lineOrder.length ? lineOrder : LINE_ORDER

    const drawAll = () => {
      const viewportW = Math.max(1, viewport.clientWidth)
      const viewportH = Math.max(1, viewport.clientHeight)
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewportW * dpr)
      canvas.height = Math.floor(viewportH * dpr)
      canvas.style.width = `${viewportW}px`
      canvas.style.height = `${viewportH}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, viewportW, viewportH)

      const scale = Math.min(viewportW / imgSize.w, viewportH / imgSize.h)
      const drawW = imgSize.w * scale
      const drawH = imgSize.h * scale
      const offsetX = (viewportW - drawW) / 2
      const offsetY = (viewportH - drawH) / 2
      const map = (pts: LinePts): LinePts => pts.map(([x, y]) => [offsetX + x * drawW, offsetY + y * drawH] as Pt)

      const mapped: DetectedLines = {
        heart: map(detectedLines.heart),
        head: map(detectedLines.head),
        life: map(detectedLines.life),
        fate: map(detectedLines.fate),
      }

      for (const id of activeOrder) {
        drawLine(ctx, mapped[id], LINE_COLORS[id], 1)
      }
    }

    drawAll()
    const observer = new ResizeObserver(() => drawAll())
    observer.observe(viewport)
    window.addEventListener('resize', drawAll)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', drawAll)
    }
  }, [phase, detectedLines, imgSize, lineOrder])

  // ── Reset ──
  const reset = useCallback(() => {
    stopStream()
    cancelAnimationFrame(rafRef.current)
    if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    setImageUrl(null)
    setImgSize(null)
    setPhase('intro')
    setErrorMsg('')
    setDrawnCount(0)
    setCurrentLine(-1)
    setLineOrder(LINE_ORDER)
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
  const safeBottomOffset = 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'
  const cameraControlsBottom = 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)'
  const activeLineOrder = lineOrder.length ? lineOrder : LINE_ORDER
  const currentLineId = currentLine >= 0 ? activeLineOrder[currentLine] : null
  const detectedCount = activeLineOrder.length
  const visibleLineIds = new Set<LineId>(activeLineOrder)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[80] flex justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-107.5 h-dvh flex flex-col"
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
            <span className="text-xs text-slate-500 capitalize">| {hand} hand</span>
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

            {torchSupported && (
              <button
                onClick={toggleTorch}
                disabled={torchBusy}
                className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/85 disabled:opacity-60"
                style={{ background: torchOn ? 'rgba(245,158,11,0.85)' : 'rgba(0,0,0,0.55)' }}
              >
                {torchOn ? <FlashlightOff size={13} /> : <Flashlight size={13} />}
                {torchOn ? 'Flash On' : 'Flash Off'}
              </button>
            )}

            <button
              onClick={openFilePicker}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/80"
              style={{ background: 'rgba(0,0,0,0.55)' }}
            >
              <Upload size={13} />
              Upload
            </button>

            <div
              className="absolute inset-x-0 flex flex-col items-center gap-5 px-4"
              style={{ bottom: cameraControlsBottom }}
            >
              <p
                className="text-sm text-white font-medium px-5 py-2 rounded-2xl text-center max-w-65 leading-snug"
                style={{ background: 'rgba(0,0,0,0.62)' }}
              >
                Place your palm inside the outline and take a photo.
                {torchSupported && !torchOn ? ' Use flash if lighting is low.' : ''}
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
                    className="relative min-h-[560px] flex flex-col items-center px-4 pt-7 pb-6"
                    style={{ background: 'radial-gradient(circle at top, rgba(6,182,212,0.16) 0%, rgba(6,35,49,0.4) 26%, rgba(6,13,27,0.95) 100%)' }}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center opacity-25">
                      <motion.div
                        animate={{ opacity: [0.24, 0.4, 0.24] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Hand
                          strokeWidth={0.55}
                          color="rgba(148,163,184,0.7)"
                          style={{
                            width: 180,
                            height: 180,
                            transform: hand === 'right' ? 'scaleX(-1)' : undefined,
                            filter: 'drop-shadow(0 0 24px rgba(100,116,139,0.24))',
                          }}
                        />
                      </motion.div>
                    </div>

                    <div
                      className="relative z-10 w-full rounded-2xl p-4 mt-16 space-y-3"
                      style={{ background: 'rgba(29,78,102,0.9)', border: '1px solid rgba(148,163,184,0.22)' }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={15} className="text-cyan-300 shrink-0" />
                          <h2 className="text-[27px] leading-none font-display font-bold text-[#F8E9BE]">Correct Gesture</h2>
                        </div>
                        <div className="flex items-end gap-5 pl-5">
                          <Image src="/assets/palm-scan/left-hand.png" alt="Correct left hand" width={50} height={50} className="h-12 w-12 object-contain" />
                          <Image src="/assets/palm-scan/right-hand.png" alt="Correct right hand" width={50} height={50} className="h-12 w-12 object-contain" />
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full border border-rose-400 flex items-center justify-center">
                            <X size={11} className="text-rose-400" />
                          </div>
                          <p className="font-display font-bold text-[#F8E9BE] text-[29px] leading-none">Incorrect Gesture &amp; Background</p>
                        </div>
                        <div className="flex items-end gap-3 pl-4">
                          <Image
                            src="/assets/palm-scan/left-hand.png"
                            alt="Incorrect hand example one"
                            width={42}
                            height={42}
                            className="h-11 w-11 object-contain opacity-75 rotate-12"
                            style={{ transformOrigin: 'bottom center' }}
                          />
                          <Image
                            src="/assets/palm-scan/right-hand.png"
                            alt="Incorrect hand example two"
                            width={42}
                            height={42}
                            className="h-11 w-11 object-contain opacity-75 -rotate-12"
                            style={{ transformOrigin: 'bottom center' }}
                          />
                          <div className="rounded-lg p-1.5" style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(148,163,184,0.35)' }}>
                            <Image src="/assets/palm-scan/rescan-left.png" alt="Bad background example" width={48} height={48} className="h-12 w-12 object-contain" />
                          </div>
                        </div>
                      </div>

                      <p className="text-[12px] leading-snug text-[#E2E8F0]">
                        * It&apos;s better to choose a dark background without any objects on it.
                      </p>

                      <motion.button
                        onClick={startCamera}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 rounded-full font-display font-bold text-[30px] text-white"
                        style={{ background: 'linear-gradient(90deg, #22D3EE, #2DD4BF)' }}
                      >
                        Start
                      </motion.button>
                    </div>

                    <button
                      onClick={openFilePicker}
                      className="relative z-10 mt-2 text-[12px] font-semibold text-cyan-100/90 underline underline-offset-4 decoration-cyan-200/40"
                    >
                      Upload photo instead
                    </button>

                    <div className="relative z-10 mt-auto flex flex-col items-center gap-4">
                      <p
                        className="max-w-xs text-center text-[12px] leading-snug px-4 py-2 rounded-xl text-slate-300"
                        style={{ background: 'rgba(2,12,27,0.68)', border: '1px solid rgba(71,85,105,0.35)' }}
                      >
                        Place your palm inside the outline and take a photo.
                      </p>
                      <motion.button
                        onClick={startCamera}
                        whileTap={{ scale: 0.94 }}
                        className="relative h-16 w-16 rounded-full flex items-center justify-center"
                        style={{ border: '3px solid rgba(100,116,139,0.7)', background: 'rgba(2,12,27,0.35)' }}
                      >
                        <span
                          className="h-11 w-11 rounded-full"
                          style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.85), rgba(8,145,178,0.85))' }}
                        />
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
            <div ref={imageViewportRef} className="relative flex-1 min-h-0 bg-black overflow-hidden">
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
                  <div className="absolute inset-x-0 flex justify-center" style={{ bottom: safeBottomOffset }}>
                    <motion.span
                      className="text-xs text-rose-300 px-3 py-1.5 rounded-full font-medium"
                      style={{ background: 'rgba(0,0,0,0.75)' }}
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      Analyzing palm lines with AI...
                    </motion.span>
                  </div>
                </>
              )}

              {/* Drawing + Results: completed line tags */}
              {(phase === 'drawing' || phase === 'results') && (
                <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                  {activeLineOrder.slice(0, drawnCount).map((id) => {
                    const l = LINE_META_BY_ID[id]
                    return (
                    <motion.div
                      key={id}
                      initial={{ x: 24, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: `${l.color}20`, border: `1px solid ${l.color}50`, color: l.color }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                      {l.label}
                    </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Drawing: current line label */}
              {phase === 'drawing' && currentLine >= 0 && (
                <motion.div
                  className="absolute inset-x-0 flex justify-center"
                  style={{ bottom: safeBottomOffset }}
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                >
                  <span
                    className="text-[11px] px-3 py-1 rounded-full font-mono"
                    style={{ background: 'rgba(0,0,0,0.8)', color: currentLineId ? LINE_META_BY_ID[currentLineId].color : '#fff' }}
                  >
                    Tracing {currentLineId ? LINE_META_BY_ID[currentLineId].label : 'Line'}...
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
                    {detectedCount} Lines Detected
                  </div>
                </motion.div>
              )}
            </div>

            {/* Results panel — scrollable below the image */}
            {phase === 'results' && (
              <div
                className="overflow-y-auto px-4 pt-4 space-y-3"
                style={{ maxHeight: '45%', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
              >
                <p className="text-xs font-semibold text-slate-400">Your Palm Analysis</p>
                {palmLines.map((line, i) => {
                  const visible = visibleLineIds.has(line.id)
                  const displayScore = visible ? line.score : 0
                  return (
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
                      <span className="text-sm font-bold" style={{ color: line.color }}>
                        {visible ? `${line.score}%` : '--'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/6 overflow-hidden mb-2">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${displayScore}%` }}
                        transition={{ duration: 0.9, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                        style={{ background: `linear-gradient(90deg, ${line.color}70, ${line.color})`, boxShadow: `0 0 6px ${line.color}40` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {visible ? line.trait : 'Line not clearly visible in this scan. Use better lighting and retake for this line.'}
                    </p>
                  </motion.div>
                  )
                })}
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


