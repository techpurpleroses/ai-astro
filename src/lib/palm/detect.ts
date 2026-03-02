import OpenAI from 'openai'
import {
  type PalmConfidenceMap,
  type PalmDetectNoPalm,
  type PalmDetectResponse,
  type PalmDetectSuccess,
  type PalmLineMap,
  PalmConfidenceMapSchema,
  PalmLineMapSchema,
} from '@/lib/palm/contracts'

const MODEL = { provider: 'openai', name: 'gpt-4o' } as const

let client: OpenAI | null = null

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
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
  if (parsed.success) return parsed.data
  return null
}

function fallbackConfidence(): PalmConfidenceMap {
  return { heart: 0.74, head: 0.74, life: 0.74, fate: 0.7 }
}

function coerceConfidence(raw: unknown): PalmConfidenceMap {
  const parsed = PalmConfidenceMapSchema.safeParse(raw)
  if (parsed.success) {
    return parsed.data
  }
  return fallbackConfidence()
}

function noPalm(reason = 'no_palm_detected'): PalmDetectNoPalm {
  return { hasPalm: false, reason, model: MODEL }
}

export async function detectPalmLines(imageDataUrl: string): Promise<PalmDetectResponse> {
  const openai = getClient()
  const response = await openai.chat.completions.create({
    model: MODEL.name,
    max_tokens: 700,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'Analyze this palm image and detect the four major palm lines.',
              'Return only JSON in one of these exact shapes:',
              '{"hasPalm":false,"reason":"no_palm"}',
              '{"hasPalm":true,"lines":{"heart":[[x,y],[x,y],[x,y]],"head":[[x,y],[x,y],[x,y]],"life":[[x,y],[x,y],[x,y]],"fate":[[x,y],[x,y],[x,y]]},"confidence":{"heart":0.0-1.0,"head":0.0-1.0,"life":0.0-1.0,"fate":0.0-1.0}}',
              'Coordinates must be normalized between 0 and 1.',
              'If the image is not a clear palm, return hasPalm:false.',
            ].join('\n'),
          },
          {
            type: 'image_url',
            image_url: { url: imageDataUrl, detail: 'high' },
          },
        ],
      },
    ],
  })

  const content = response.choices[0]?.message?.content?.trim()
  if (!content) return noPalm('empty_model_output')

  const parsed = parseJsonFromText(content)
  if (!parsed || typeof parsed !== 'object') return noPalm('invalid_model_output')

  const payload = parsed as Record<string, unknown>
  const hasPalm = payload.hasPalm
  if (hasPalm === false || payload.error === 'no_palm') {
    const reason = typeof payload.reason === 'string' ? payload.reason : 'no_palm'
    return noPalm(reason)
  }

  // Accept either { lines: {...} } or direct {...lines}
  const lineCandidate = payload.lines ?? payload
  const lines = coerceLines(lineCandidate)
  if (!lines) return noPalm('lines_not_detected')

  const rawConfidence = payload.confidence
  const confidence = coerceConfidence(rawConfidence)

  // Clamp once more to avoid unexpected model drift
  const normalizedConfidence: PalmConfidenceMap = {
    heart: clamp01(confidence.heart),
    head: clamp01(confidence.head),
    life: clamp01(confidence.life),
    fate: clamp01(confidence.fate),
  }

  const result: PalmDetectSuccess = {
    hasPalm: true,
    lines,
    confidence: normalizedConfidence,
    model: MODEL,
  }
  return result
}
