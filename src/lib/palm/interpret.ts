import {
  PALM_LINE_IDS,
  type PalmLineId,
  type PalmLineMap,
  type PalmInterpretRequest,
  type PalmInterpretResponse,
  PalmInterpretResponseSchema,
  PalmLineTextMapSchema,
} from '@/lib/palm/contracts'
import OpenAI from 'openai'
import { z } from 'zod'

type Pt = [number, number]
const PALM_DEBUG = process.env.PALM_DEBUG !== '0'
const PALM_INTERPRET_USE_MOCK = process.env.PALM_INTERPRET_USE_MOCK === '1'

const IDEAL_CURVATURE: Record<PalmLineId, number> = {
  heart: 0.32,
  head: 0.2,
  life: 0.48,
  fate: 0.14,
}
const NOT_VISIBLE_SUMMARY = 'Line not clearly visible in this scan.'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function distance(a: Pt, b: Pt) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return Math.sqrt(dx * dx + dy * dy)
}

function midpointDeviation(start: Pt, mid: Pt, end: Pt) {
  const vx = end[0] - start[0]
  const vy = end[1] - start[1]
  const denom = Math.sqrt(vx * vx + vy * vy)
  if (denom === 0) return 0
  const numerator = Math.abs(vy * mid[0] - vx * mid[1] + end[0] * start[1] - end[1] * start[0])
  return numerator / denom
}

function lineMetrics(points: PalmLineMap[PalmLineId], depth: number) {
  if (!points.length) {
    return {
      lengthRaw: 0,
      curvatureRaw: 0,
      length: 0,
      depth: round(depth, 2),
      curvature: 0,
    }
  }
  if (points.length === 1) {
    return {
      lengthRaw: 0,
      curvatureRaw: 0,
      length: 0,
      depth: round(depth, 2),
      curvature: 0,
    }
  }
  const start = points[0]
  const end = points[points.length - 1]
  const mid = points[Math.floor(points.length / 2)]

  let polylineLength = 0
  for (let i = 0; i < points.length - 1; i++) {
    polylineLength += distance(points[i], points[i + 1])
  }
  const lengthRaw = polylineLength
  const curvatureRaw = midpointDeviation(start, mid, end)

  return {
    lengthRaw,
    curvatureRaw,
    length: round(lengthRaw * 10, 2),
    depth: round(depth, 2),
    curvature: round(curvatureRaw * 10, 2),
  }
}

function scoreLine(line: PalmLineId, lengthRaw: number, curvatureRaw: number, depth: number) {
  const lengthComponent = clamp(lengthRaw / 1.25, 0, 1)
  const depthComponent = clamp(depth, 0, 1)

  const ideal = IDEAL_CURVATURE[line]
  const curveDistance = Math.abs(curvatureRaw - ideal)
  const curveComponent = clamp(1 - curveDistance / (ideal + 0.18), 0, 1)

  const weighted = lengthComponent * 0.42 + depthComponent * 0.38 + curveComponent * 0.2
  return clamp(Math.round(54 + weighted * 42), 45, 98)
}

function lineSummary(line: PalmLineId, score: number) {
  if (line === 'heart') {
    if (score >= 85) return 'Strong emotional clarity with healthy boundaries in relationships.'
    if (score >= 70) return 'Balanced emotional awareness, affectionate but pragmatic in attachment.'
    return 'Sensitive emotional profile; grounding habits can improve relationship steadiness.'
  }
  if (line === 'head') {
    if (score >= 85) return 'Clear analytical focus with strong pattern recognition.'
    if (score >= 70) return 'Practical thinker with stable decision-making under pressure.'
    return 'Thinking style is adaptive but may benefit from better focus routines.'
  }
  if (line === 'life') {
    if (score >= 85) return 'High vitality signature with strong resilience in transitions.'
    if (score >= 70) return 'Consistent energy profile with good long-term balance.'
    return 'Energy management should be a priority to avoid burnout cycles.'
  }
  if (score >= 85) return 'Purpose-driven line with strong career momentum signals.'
  if (score >= 70) return 'Steady ambition profile with gradual and reliable progress.'
  return 'Career direction appears flexible; clearer goals can improve momentum.'
}

function inferInsights(scores: Record<PalmLineId, number>) {
  const emotionalType = scores.heart >= 82 ? 'Intuitive Connector' : scores.heart >= 68 ? 'Balanced Empath' : 'Reserved Feeler'
  const cognitiveStyle = scores.head >= 82 ? 'Strategic Thinker' : scores.head >= 68 ? 'Practical Analyst' : 'Exploratory Learner'
  const vitality = scores.life >= 82 ? 'High Endurance' : scores.life >= 68 ? 'Stable Energy' : 'Variable Energy'
  const careerFocus = scores.fate >= 82 ? 'Purpose-Led Builder' : scores.fate >= 68 ? 'Steady Climber' : 'Adaptive Pathfinder'

  return {
    emotionalType,
    cognitiveStyle,
    vitality,
    careerFocus,
  }
}

function isLineVisible(lineId: PalmLineId, points: PalmLineMap[PalmLineId], confidence: number) {
  if (lineId === 'fate') {
    return points.length >= 4 && confidence >= 0.35
  }
  return points.length >= 2 && confidence >= 0.25
}

const OpenAiPalmNarrativeSchema = z.object({
  lineSuggestion: PalmLineTextMapSchema,
  insights: PalmInterpretResponseSchema.shape.insights,
})

type OpenAiPalmNarrative = z.infer<typeof OpenAiPalmNarrativeSchema>

let cachedOpenAi: OpenAI | null | undefined

function debugLog(step: string, data?: Record<string, unknown>) {
  if (!PALM_DEBUG) return
  if (data) {
    console.log(`[palm.interpret] ${step}`, data)
    return
  }
  console.log(`[palm.interpret] ${step}`)
}

function getOpenAiClient() {
  if (cachedOpenAi !== undefined) return cachedOpenAi
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    cachedOpenAi = null
    return cachedOpenAi
  }
  cachedOpenAi = new OpenAI({ apiKey: key })
  return cachedOpenAi
}

function buildPromptPayload(input: PalmInterpretRequest, base: PalmInterpretResponse) {
  return {
    side: input.side,
    lineScore: base.core.lineScore,
    confidence: input.confidence,
    metrics: {
      heart: base.lines.heart.metrics,
      head: base.lines.head.metrics,
      life: base.lines.life.metrics,
      fate: base.lines.fate.metrics,
    },
  }
}

async function generateOpenAiNarrative(
  input: PalmInterpretRequest,
  base: PalmInterpretResponse
): Promise<OpenAiPalmNarrative | null> {
  if (process.env.PALM_INTERPRET_USE_OPENAI === '0') return null

  const client = getOpenAiClient()
  if (!client) return null

  const model = process.env.PALM_OPENAI_MODEL?.trim() || 'gpt-4.1-mini'
  const payload = buildPromptPayload(input, base)
  debugLog('openai.request.start', {
    model,
    side: input.side,
    score: base.core.lineScore,
  })
  const startedAt = Date.now()

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.55,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a palmistry assistant. Return valid JSON only, no markdown. ' +
            'Use this exact shape: {"lineSuggestion":{"heart":"...","head":"...","life":"...","fate":"..."},"insights":{"emotionalType":"...","cognitiveStyle":"...","vitality":"...","careerFocus":"..."}}. ' +
            'Each lineSuggestion should be one short sentence grounded in the numeric data.',
        },
        {
          role: 'user',
          content: `Interpret this palm scan:\n${JSON.stringify(payload)}`,
        },
      ],
    })
    debugLog('openai.request.end', { ms: Date.now() - startedAt })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const validated = OpenAiPalmNarrativeSchema.safeParse(parsed)
    if (!validated.success) return null
    debugLog('openai.response.valid', {
      chars: raw.length,
      insights: validated.data.insights,
    })
    return validated.data
  } catch (error) {
    console.warn('palm.interpret openai fallback:', error)
    debugLog('openai.response.fail', {
      reason: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

function mergeNarrative(
  base: PalmInterpretResponse,
  narrative: OpenAiPalmNarrative
): PalmInterpretResponse {
  const keepBase = (lineId: PalmLineId) => base.lines[lineId].summary === NOT_VISIBLE_SUMMARY

  const lineSuggestion = {
    heart: keepBase('heart') ? base.core.lineSuggestion.heart : narrative.lineSuggestion.heart,
    head: keepBase('head') ? base.core.lineSuggestion.head : narrative.lineSuggestion.head,
    life: keepBase('life') ? base.core.lineSuggestion.life : narrative.lineSuggestion.life,
    fate: keepBase('fate') ? base.core.lineSuggestion.fate : narrative.lineSuggestion.fate,
  }

  return PalmInterpretResponseSchema.parse({
    ...base,
    core: {
      ...base.core,
      lineSuggestion,
    },
    insights: narrative.insights,
    lines: {
      heart: { ...base.lines.heart, summary: lineSuggestion.heart },
      head: { ...base.lines.head, summary: lineSuggestion.head },
      life: { ...base.lines.life, summary: lineSuggestion.life },
      fate: { ...base.lines.fate, summary: lineSuggestion.fate },
    },
  })
}

function mockNarrative(base: PalmInterpretResponse): PalmInterpretResponse {
  const lineSuggestion = {
    heart: 'Mock: heart line interpretation for UI testing.',
    head: 'Mock: head line interpretation for UI testing.',
    life: 'Mock: life line interpretation for UI testing.',
    fate: 'Mock: fate line interpretation for UI testing.',
  }

  return PalmInterpretResponseSchema.parse({
    ...base,
    core: {
      ...base.core,
      lineSuggestion,
    },
    insights: {
      emotionalType: 'Mock: emotional insight',
      cognitiveStyle: 'Mock: cognitive insight',
      vitality: 'Mock: vitality insight',
      careerFocus: 'Mock: career insight',
    },
    lines: {
      heart: { ...base.lines.heart, summary: lineSuggestion.heart },
      head: { ...base.lines.head, summary: lineSuggestion.head },
      life: { ...base.lines.life, summary: lineSuggestion.life },
      fate: { ...base.lines.fate, summary: lineSuggestion.fate },
    },
  })
}

export function interpretPalmScanDeterministic(input: PalmInterpretRequest): PalmInterpretResponse {
  const scoreByLine = {} as Record<PalmLineId, number>
  const suggestionByLine = {} as Record<PalmLineId, string>
  const lines = {
    heart: {
      score: 0,
      summary: '',
      metrics: { length: 0, depth: 0, curvature: 0 },
    },
    head: {
      score: 0,
      summary: '',
      metrics: { length: 0, depth: 0, curvature: 0 },
    },
    life: {
      score: 0,
      summary: '',
      metrics: { length: 0, depth: 0, curvature: 0 },
    },
    fate: {
      score: 0,
      summary: '',
      metrics: { length: 0, depth: 0, curvature: 0 },
    },
  }

  for (const lineId of PALM_LINE_IDS) {
    const points = input.lines[lineId]
    const confidence = input.confidence[lineId]
    const metrics = lineMetrics(points, confidence)
    const visible = isLineVisible(lineId, points, confidence)
    if (!visible) {
      scoreByLine[lineId] = 0
      suggestionByLine[lineId] = NOT_VISIBLE_SUMMARY
      lines[lineId] = {
        score: 0,
        summary: NOT_VISIBLE_SUMMARY,
        metrics: {
          length: 0,
          depth: round(confidence, 2),
          curvature: 0,
        },
      }
      continue
    }
    const score = scoreLine(lineId, metrics.lengthRaw, metrics.curvatureRaw, confidence)
    const summary = lineSummary(lineId, score)

    scoreByLine[lineId] = score
    suggestionByLine[lineId] = summary
    lines[lineId] = {
      score,
      summary,
      metrics: {
        length: metrics.length,
        depth: metrics.depth,
        curvature: metrics.curvature,
      },
    }
  }

  const insights = inferInsights(scoreByLine)

  const response: PalmInterpretResponse = {
    core: {
      lineScore: {
        heart: scoreByLine.heart,
        head: scoreByLine.head,
        life: scoreByLine.life,
        fate: scoreByLine.fate,
      },
      lineSuggestion: {
        heart: suggestionByLine.heart,
        head: suggestionByLine.head,
        life: suggestionByLine.life,
        fate: suggestionByLine.fate,
      },
    },
    insights,
    lines,
  }

  return PalmInterpretResponseSchema.parse(response)
}

export async function interpretPalmScan(input: PalmInterpretRequest): Promise<PalmInterpretResponse> {
  const startedAt = Date.now()
  debugLog('pipeline.start', { side: input.side, confidence: input.confidence })
  const base = interpretPalmScanDeterministic(input)
  debugLog('deterministic.ready', { score: base.core.lineScore })
  if (PALM_INTERPRET_USE_MOCK) {
    const mocked = mockNarrative(base)
    debugLog('pipeline.done.mock', { ms: Date.now() - startedAt })
    return mocked
  }
  const narrative = await generateOpenAiNarrative(input, base)
  if (!narrative) {
    debugLog('pipeline.done.fallback', { ms: Date.now() - startedAt })
    return base
  }
  const merged = mergeNarrative(base, narrative)
  debugLog('pipeline.done.openai', { ms: Date.now() - startedAt })
  return merged
}
