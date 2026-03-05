import { spawn } from 'child_process'
import path from 'path'
import {
  type PalmConfidenceMap,
  type PalmDetectNoPalm,
  type PalmDetectResponse,
  type PalmDetectSuccess,
  type PalmLineMap,
  PalmConfidenceMapSchema,
  PalmLineMapSchema,
} from '@/lib/palm/contracts'

const PALM_DEBUG = process.env.PALM_DEBUG !== '0'
const MODEL = {
  provider: 'roboflow',
  name: process.env.ROBOFLOW_MODEL_ID?.trim() || 'palm-lines-recognition-wemy5/1',
} as const
const DETECTOR_TIMEOUT_MS = 20000

function debugLog(step: string, data?: Record<string, unknown>) {
  if (!PALM_DEBUG) return
  if (data) {
    console.log(`[palm.detect] ${step}`, data)
    return
  }
  console.log(`[palm.detect] ${step}`)
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
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
  if (message.includes('ENOENT')) return 'python_not_found'
  if (message.includes('401')) return 'roboflow_auth_failed'
  if (message.includes('429')) return 'roboflow_rate_limited'
  return 'detector_runtime_error'
}

function pythonInvocation() {
  const envCmd = process.env.PALM_PYTHON_CMD?.trim()
  if (envCmd) {
    return { command: envCmd, args: [] as string[] }
  }

  if (process.platform === 'win32') {
    const preferred = process.env.PALM_PYTHON_VERSION?.trim() || '3.11'
    return { command: 'py', args: [`-${preferred}`, '-u'] }
  }

  return { command: 'python3', args: ['-u'] }
}

async function runRoboflowDetector(input: {
  image: string
  side?: 'left' | 'right'
  imageWidth?: number
  imageHeight?: number
}): Promise<Record<string, unknown>> {
  const { command, args } = pythonInvocation()
  const scriptPath = path.join(process.cwd(), 'scripts', 'palm_detect_roboflow.py')

  return await new Promise<Record<string, unknown>>((resolve, reject) => {
    const child = spawn(command, [...args, scriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: process.env,
    })

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('palm_detector_timeout'))
    }, DETECTOR_TIMEOUT_MS)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.stdin.on('error', () => {
      // Child may exit before reading stdin.
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (!stdout.trim()) {
        reject(new Error(`palm_detector_empty_output:${code ?? 'unknown'}:${stderr.trim()}`))
        return
      }
      try {
        const parsed = parseJsonFromText(stdout.trim())
        if (!parsed || typeof parsed !== 'object') {
          reject(new Error('palm_detector_invalid_json_shape'))
          return
        }
        resolve(parsed as Record<string, unknown>)
      } catch (error) {
        reject(error)
      }
    })

    try {
      child.stdin.end(JSON.stringify(input))
    } catch {
      // Handled by close event.
    }
  })
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
    console.error('palm.detect runtime error:', message)
    const reason = detectorErrorReason(message)
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
