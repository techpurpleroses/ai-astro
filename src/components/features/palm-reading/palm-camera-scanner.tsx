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
import { Camera, Upload, RotateCcw, X, Lightbulb, CheckCircle, AlertCircle, Hand, Flashlight, FlashlightOff } from 'lucide-react'
import type { PalmScanRecord } from '@/lib/palm/contracts'

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
const PALM_DEBUG = process.env.NEXT_PUBLIC_PALM_DEBUG !== '0'
const UPLOAD_MAX_DIMENSION = 1600
const UPLOAD_TARGET_BYTES = 1_400_000
const UPLOAD_MIN_QUALITY = 0.62

type PalmScanApiPayload = Partial<PalmScanRecord> & {
  error?: string
  details?: { reason?: string }
}

interface ProcessedImage {
  dataUrl: string
  width: number
  height: number
}

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

// â”€â”€ Canvas drawing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Hand guide overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Open camera â”€â”€
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

  // â”€â”€ Upload photo â”€â”€
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
      setImageUrl(optimized.dataUrl)
      setImgSize({ w: optimized.width, h: optimized.height })
      await analyzeImage(optimized.dataUrl, optimized.width, optimized.height)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMsg('Failed to process selected image.')
      setPhase('error')
      logScan('upload.process.fail', { message })
    }
  }, [analyzeImage])

  // â”€â”€ Capture from camera â”€â”€
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
      setImageUrl(optimized.dataUrl)
      setImgSize({ w: optimized.width, h: optimized.height })
      await analyzeImage(optimized.dataUrl, optimized.width, optimized.height)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setErrorMsg('Failed to process captured image.')
      setPhase('error')
      logScan('capture.process.fail', { message })
    }
  }, [stopStream, analyzeImage])

  // â”€â”€ Animate lines onto canvas when phase = drawing â”€â”€
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
        const id = LINE_ORDER[i]
        drawLine(ctx, mappedLines[id], LINE_COLORS[id], 1)
      }

      const currentId = LINE_ORDER[lineIdx]
      drawLine(ctx, mappedLines[currentId], LINE_COLORS[currentId], progress)

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

  // â”€â”€ Reset â”€â”€
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

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="fixed inset-0 z-[80] flex justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-107.5 h-dvh flex flex-col"
        style={{ background: 'rgba(6,13,27,0.97)', backdropFilter: 'blur(20px)' }}
      >
        {/* â”€â”€ Header â”€â”€ */}
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

        {/* â”€â”€ CAMERA phase â€” full-screen live view â”€â”€ */}
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

        {/* â”€â”€ TEXT phases (intro / error) â€” centered, constrained â”€â”€ */}
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
                        <span className="text-6xl select-none">{hand === 'left' ? 'ðŸ¤š' : 'âœ‹'}</span>
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
                        'Good lighting â€” natural light works best',
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

        {/* â”€â”€ IMAGE phases (scanning / drawing / results) â€” full-width â”€â”€ */}
        {isImagePhase && imageUrl && (
          <div className="flex-1 flex flex-col min-h-0">

            {/* Full-width image + canvas overlay â€” no forced aspect ratio */}
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

              {/* Canvas â€” mounted during scanning, persists through drawing + results */}
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
                  className="absolute inset-x-0 flex justify-center"
                  style={{ bottom: safeBottomOffset }}
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                >
                  <span
                    className="text-[11px] px-3 py-1 rounded-full font-mono"
                    style={{ background: 'rgba(0,0,0,0.8)', color: LINE_META[currentLine]?.color }}
                  >
                    Tracing {LINE_META[currentLine]?.label}...
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

            {/* Results panel â€” scrollable below the image */}
            {phase === 'results' && (
              <div
                className="overflow-y-auto px-4 pt-4 space-y-3"
                style={{ maxHeight: '45%', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
              >
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

