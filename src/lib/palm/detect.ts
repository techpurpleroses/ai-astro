import {
  type PalmConfidenceMap,
  type PalmDetectNoPalm,
  type PalmDetectResponse,
  type PalmDetectSuccess,
  type PalmLineMap,
  PalmConfidenceMapSchema,
  PalmLineMapSchema,
} from '@/lib/palm/contracts'
import { clamp01, createDebugLogger, round } from '@/lib/palm/utils'
import { createServerLogger } from '@/server/foundation/observability/logger'

const debugLog = createDebugLogger('palm.detect')
const logger = createServerLogger('palm.detect')
const MODEL = {
  provider: 'roboflow',
  name: process.env.ROBOFLOW_MODEL_ID?.trim() || 'palm-lines-recognition-wemy5/1',
} as const
const ROBOFLOW_API_URL = (process.env.ROBOFLOW_API_URL?.trim() || 'https://serverless.roboflow.com').replace(/\/+$/, '')
const DETECTOR_TIMEOUT_MS = 20000

const LINE_IDS = ['heart', 'head', 'life', 'fate'] as const

type LineId = (typeof LINE_IDS)[number]
type Point = [number, number]

type RawPrediction = Record<string, unknown>

interface Candidate {
  label: string
  points: Point[]
  confidence: number
  avgX: number
  avgY: number
  spanX: number
  spanY: number
  verticality: number
  curvature: number
}

function parseJsonFromText(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('invalid_json')
    }
    return JSON.parse(text.slice(start, end + 1))
  }
}

function coerceLines(raw: unknown): PalmLineMap | null {
  if (!raw || typeof raw !== 'object') return null
  const parsed = PalmLineMapSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

function fallbackConfidence(): PalmConfidenceMap {
  return { heart: 0.6, head: 0.6, life: 0.6, fate: 0.45 }
}

function coerceConfidence(raw: unknown): PalmConfidenceMap {
  const parsed = PalmConfidenceMapSchema.safeParse(raw)
  return parsed.success ? parsed.data : fallbackConfidence()
}

function noPalm(reason = 'no_palm_detected'): PalmDetectNoPalm {
  return { hasPalm: false, reason, model: MODEL }
}

function detectorErrorReason(message: string) {
  if (message.includes('roboflow_api_key_missing')) return 'roboflow_api_key_missing'
  if (message.includes('invalid_json')) return 'invalid_detector_output'
  if (message.includes('palm_detector_timeout')) return 'detector_timeout'
  if (message.includes('roboflow_http_401')) return 'roboflow_auth_failed'
  if (message.includes('roboflow_http_429')) return 'roboflow_rate_limited'
  if (message.includes('invalid_image_dimensions')) return 'invalid_image_dimensions'
  if (message.includes('no_predictions')) return 'no_predictions'
  return 'detector_runtime_error'
}

function parseModelId(modelId: string) {
  const chunks = modelId.split('/').map((part) => part.trim()).filter(Boolean)
  if (chunks.length !== 2) return null
  return { project: chunks[0], version: chunks[1] }
}

function sanitizeLabel(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function mapLabel(label: string): LineId | null {
  const s = sanitizeLabel(label)
  if (!s) return null
  if (s.includes('heart')) return 'heart'
  if (s.includes('head') || s.includes('mind')) return 'head'
  if (s.includes('life') || s.includes('longevity')) return 'life'
  if (s.includes('fate') || s.includes('career') || s.includes('destiny')) return 'fate'
  return null
}

function samplePolyline(points: Point[], target = 12): Point[] {
  if (points.length <= target) return points
  const step = (points.length - 1) / Math.max(1, target - 1)
  const out: Point[] = []
  for (let i = 0; i < target; i++) {
    const idx = Math.round(i * step)
    out.push(points[idx])
  }
  return out
}

function interpolate(a: Point, b: Point, n: number): Point[] {
  if (n <= 1) return [a]
  const out: Point[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    out.push([a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t])
  }
  return out
}

function extractPoints(prediction: RawPrediction): Point[] {
  const keypoints = prediction.keypoints
  const points: Point[] = []

  if (Array.isArray(keypoints)) {
    for (const keypoint of keypoints) {
      if (Array.isArray(keypoint) && keypoint.length >= 2) {
        const x = keypoint[0]
        const y = keypoint[1]
        if (typeof x === 'number' && typeof y === 'number') {
          points.push([x, y])
        }
        continue
      }

      if (!keypoint || typeof keypoint !== 'object') continue
      const x = (keypoint as Record<string, unknown>).x
      const y = (keypoint as Record<string, unknown>).y
      if (typeof x === 'number' && typeof y === 'number') {
        points.push([x, y])
      }
    }
  }

  if (points.length >= 2) return points

  const x = prediction.x
  const y = prediction.y
  const w = prediction.width
  const h = prediction.height
  if (
    typeof x === 'number' &&
    typeof y === 'number' &&
    typeof w === 'number' &&
    typeof h === 'number'
  ) {
    const left = x - w / 2
    const right = x + w / 2
    const top = y - h / 2
    const bottom = y + h / 2
    if (h >= w) {
      return interpolate([x, bottom], [x, top], 8)
    }
    return interpolate([left, y], [right, y], 8)
  }

  return []
}

function curvature(points: Point[]): number {
  if (points.length < 3) return 0
  const start = points[0]
  const mid = points[Math.floor(points.length / 2)]
  const end = points[points.length - 1]

  const vx = end[0] - start[0]
  const vy = end[1] - start[1]
  const denom = Math.hypot(vx, vy)
  if (denom <= 1e-6) return 0

  const numer = Math.abs(vy * mid[0] - vx * mid[1] + end[0] * start[1] - end[1] * start[0])
  return numer / denom
}

function orientPoints(points: Point[], lineId: LineId): Point[] {
  if (points.length < 2) return points
  const first = points[0]
  const last = points[points.length - 1]

  if (lineId === 'fate') {
    return first[1] >= last[1] ? points : [...points].reverse()
  }

  if (lineId === 'life') {
    return first[1] <= last[1] ? points : [...points].reverse()
  }

  return first[0] <= last[0] ? points : [...points].reverse()
}

function buildCandidate(prediction: RawPrediction, width: number, height: number): Candidate | null {
  const rawPoints = extractPoints(prediction)
  if (rawPoints.length < 2 || width <= 0 || height <= 0) return null

  const normalized = samplePolyline(
    rawPoints.map(([x, y]) => [clamp01(x / width), clamp01(y / height)] as Point),
    12,
  )
  const xs = normalized.map((point) => point[0])
  const ys = normalized.map((point) => point[1])
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanY = Math.max(...ys) - Math.min(...ys)
  const confidence = typeof prediction.confidence === 'number' ? clamp01(prediction.confidence) : 0.5
  const label = typeof prediction.class === 'string' ? prediction.class : ''

  return {
    label,
    points: normalized,
    confidence,
    avgX: xs.reduce((sum, value) => sum + value, 0) / xs.length,
    avgY: ys.reduce((sum, value) => sum + value, 0) / ys.length,
    spanX,
    spanY,
    verticality: spanY / (spanX + 1e-6),
    curvature: curvature(normalized),
  }
}

function assignByGeometry(candidates: Candidate[], sideHint?: 'left' | 'right') {
  if (!candidates.length) return {} as Partial<Record<LineId, Candidate>>
  let remaining = [...candidates]

  let fate = remaining[0]
  let fateScore = -Infinity
  for (const candidate of remaining) {
    const score = candidate.verticality * 1.2 + candidate.spanY - candidate.spanX * 0.25
    if (score > fateScore) {
      fate = candidate
      fateScore = score
    }
  }
  remaining = remaining.filter((candidate) => candidate !== fate)

  const thumbTarget = sideHint === 'left' ? 0.68 : sideHint === 'right' ? 0.32 : 0.5
  let life = fate
  if (remaining.length) {
    let lifeScore = -Infinity
    life = remaining[0]
    for (const candidate of remaining) {
      const score =
        (1 - Math.abs(candidate.avgX - thumbTarget)) * 0.9 +
        candidate.curvature * 1.5 +
        candidate.spanY * 0.35 -
        candidate.verticality * 0.1
      if (score > lifeScore) {
        life = candidate
        lifeScore = score
      }
    }
    remaining = remaining.filter((candidate) => candidate !== life)
  }

  let heart: Candidate | undefined
  let head: Candidate | undefined
  if (remaining.length >= 2) {
    const sortedByY = [...remaining].sort((a, b) => a.avgY - b.avgY)
    ;[heart, head] = sortedByY
  } else if (remaining.length === 1) {
    const only = remaining[0]
    if (only.avgY < 0.43) {
      heart = only
    } else {
      head = only
    }
  }

  const assigned: Partial<Record<LineId, Candidate>> = { fate, life }
  if (heart) assigned.heart = heart
  if (head) assigned.head = head
  return assigned
}

function mapPredictionsToLines(
  predictions: RawPrediction[],
  width: number,
  height: number,
  sideHint?: 'left' | 'right',
): Record<string, unknown> {
  const byLabel: Partial<Record<LineId, Candidate>> = {}
  const unlabeled: Candidate[] = []

  for (const prediction of predictions) {
    const candidate = buildCandidate(prediction, width, height)
    if (!candidate) continue

    const lineId = mapLabel(candidate.label)
    if (!lineId) {
      unlabeled.push(candidate)
      continue
    }

    const current = byLabel[lineId]
    if (!current || candidate.confidence > current.confidence) {
      byLabel[lineId] = candidate
    }
  }

  if (Object.keys(byLabel).length < 3 && unlabeled.length) {
    const geometryAssignments = assignByGeometry([...unlabeled, ...Object.values(byLabel).filter(Boolean) as Candidate[]], sideHint)
    for (const lineId of LINE_IDS) {
      if (!byLabel[lineId] && geometryAssignments[lineId]) {
        byLabel[lineId] = geometryAssignments[lineId]
      }
    }
  }

  const linesOut: PalmLineMap = {
    heart: [],
    head: [],
    life: [],
    fate: [],
  }
  const confidenceOut: PalmConfidenceMap = {
    heart: 0.25,
    head: 0.25,
    life: 0.25,
    fate: 0.25,
  }

  for (const lineId of LINE_IDS) {
    const candidate = byLabel[lineId]
    if (!candidate) continue

    const oriented = orientPoints(candidate.points, lineId)
    const sampled = samplePolyline(oriented, 12)
    linesOut[lineId] = sampled.map(([x, y]) => [round(clamp01(x), 4), round(clamp01(y), 4)] as Point)
    confidenceOut[lineId] = round(clamp01(candidate.confidence), 3)
  }

  const majorCount = (['heart', 'head', 'life'] as const).filter((lineId) => linesOut[lineId].length >= 4).length
  if (majorCount < 2) {
    return { hasPalm: false, reason: 'major_lines_missing' }
  }

  return { hasPalm: true, lines: linesOut, confidence: confidenceOut }
}

function extractBase64Data(imageDataUrl: string) {
  const commaIndex = imageDataUrl.indexOf(',')
  if (commaIndex < 0) {
    throw new Error('invalid_image_data_url')
  }
  return imageDataUrl.slice(commaIndex + 1)
}

function inferImageSizeFromBytes(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 24) return null

  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (isPng) {
    const width = bytes.readUInt32BE(16)
    const height = bytes.readUInt32BE(20)
    if (width > 0 && height > 0) return { width, height }
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8
  if (isJpeg) {
    let index = 2
    while (index + 9 < bytes.length) {
      if (bytes[index] !== 0xff) {
        index += 1
        continue
      }

      const marker = bytes[index + 1]
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      if (isSof) {
        const height = bytes.readUInt16BE(index + 5)
        const width = bytes.readUInt16BE(index + 7)
        if (width > 0 && height > 0) {
          return { width, height }
        }
        return null
      }

      const segmentLength = bytes.readUInt16BE(index + 2)
      if (segmentLength < 2) break
      index += 2 + segmentLength
    }
  }

  return null
}

async function callRoboflow(modelId: string, apiKey: string, encodedImage: string): Promise<Record<string, unknown>> {
  const model = parseModelId(modelId)
  if (!model) {
    throw new Error('invalid_model_id')
  }

  const url = new URL(`${ROBOFLOW_API_URL}/${encodeURIComponent(model.project)}/${encodeURIComponent(model.version)}`)
  url.searchParams.set('api_key', apiKey)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DETECTOR_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: encodedImage,
      signal: controller.signal,
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('palm_detector_timeout')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }

  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(`roboflow_http_${response.status}:${responseText.slice(0, 300)}`)
  }

  const parsed = parseJsonFromText(responseText)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid_json')
  }

  return parsed as Record<string, unknown>
}

async function runRoboflowDetector(input: {
  image: string
  side?: 'left' | 'right'
  imageWidth?: number
  imageHeight?: number
}): Promise<Record<string, unknown>> {
  const apiKey = process.env.ROBOFLOW_API_KEY?.trim()
  if (!apiKey) {
    return { hasPalm: false, reason: 'roboflow_api_key_missing' }
  }

  const encodedImage = extractBase64Data(input.image)
  const imageBytes = Buffer.from(encodedImage, 'base64')
  const inferredSize = inferImageSizeFromBytes(imageBytes)

  const width = Number.isFinite(input.imageWidth) && Number(input.imageWidth) > 0
    ? Number(input.imageWidth)
    : (inferredSize?.width ?? 0)
  const height = Number.isFinite(input.imageHeight) && Number(input.imageHeight) > 0
    ? Number(input.imageHeight)
    : (inferredSize?.height ?? 0)

  if (width <= 0 || height <= 0) {
    return { hasPalm: false, reason: 'invalid_image_dimensions' }
  }

  const inferResponse = await callRoboflow(MODEL.name, apiKey, encodedImage)
  const predictionsRaw = inferResponse.predictions
  const predictions = Array.isArray(predictionsRaw)
    ? predictionsRaw.filter((prediction): prediction is RawPrediction => !!prediction && typeof prediction === 'object')
    : []

  if (!predictions.length) {
    return { hasPalm: false, reason: 'no_predictions' }
  }

  return mapPredictionsToLines(predictions, width, height, input.side)
}

export async function detectPalmLines(
  imageDataUrl: string,
  side?: 'left' | 'right',
  options?: { imageWidth?: number; imageHeight?: number }
): Promise<PalmDetectResponse> {
  const startedAt = Date.now()
  debugLog('pipeline.start', {
    side: side ?? 'unknown',
    imageChars: imageDataUrl.length,
    imageWidth: options?.imageWidth ?? null,
    imageHeight: options?.imageHeight ?? null,
    model: MODEL.name,
  })

  let payload: Record<string, unknown>
  try {
    payload = await runRoboflowDetector({
      image: imageDataUrl,
      side,
      imageWidth: options?.imageWidth,
      imageHeight: options?.imageHeight,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const reason = detectorErrorReason(message)
    logger.error('pipeline.error', { error, reason, durationMs: Date.now() - startedAt, outcome: 'error' })
    debugLog('pipeline.fail', { reason, ms: Date.now() - startedAt })
    return noPalm(reason)
  }

  if (payload.hasPalm === false || payload.error === 'no_palm') {
    const reason = typeof payload.reason === 'string' ? payload.reason : 'no_palm'
    debugLog('pipeline.no_palm', { reason, ms: Date.now() - startedAt })
    return noPalm(reason)
  }

  const lineCandidate = payload.lines ?? payload
  const lines = coerceLines(lineCandidate)
  if (!lines) {
    debugLog('pipeline.no_palm', { reason: 'lines_not_detected', ms: Date.now() - startedAt })
    return noPalm('lines_not_detected')
  }

  const confidenceRaw = coerceConfidence(payload.confidence)
  const confidence: PalmConfidenceMap = {
    heart: clamp01(confidenceRaw.heart),
    head: clamp01(confidenceRaw.head),
    life: clamp01(confidenceRaw.life),
    fate: clamp01(confidenceRaw.fate),
  }

  const result: PalmDetectSuccess = {
    hasPalm: true,
    lines,
    confidence,
    model: MODEL,
  }
  debugLog('pipeline.success', {
    ms: Date.now() - startedAt,
    confidence,
    lengths: {
      heart: lines.heart.length,
      head: lines.head.length,
      life: lines.life.length,
      fate: lines.fate.length,
    },
  })
  return result
}
