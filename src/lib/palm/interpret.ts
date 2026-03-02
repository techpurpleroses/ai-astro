import {
  PALM_LINE_IDS,
  type PalmLineId,
  type PalmLineMap,
  type PalmInterpretRequest,
  type PalmInterpretResponse,
  PalmInterpretResponseSchema,
} from '@/lib/palm/contracts'

type Pt = [number, number]

const IDEAL_CURVATURE: Record<PalmLineId, number> = {
  heart: 0.32,
  head: 0.2,
  life: 0.48,
  fate: 0.14,
}

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
  const [start, mid, end] = points
  const lengthRaw = distance(start, end)
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
  const lengthComponent = clamp(lengthRaw / 0.85, 0, 1)
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

export function interpretPalmScan(input: PalmInterpretRequest): PalmInterpretResponse {
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
    const metrics = lineMetrics(input.lines[lineId], input.confidence[lineId])
    const score = scoreLine(lineId, metrics.lengthRaw, metrics.curvatureRaw, input.confidence[lineId])
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
