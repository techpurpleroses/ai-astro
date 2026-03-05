import { z } from 'zod'

export const PALM_LINE_IDS = ['heart', 'head', 'life', 'fate'] as const

export const PalmSideSchema = z.enum(['left', 'right'])
export const PalmImageDataUrlSchema = z
  .string()
  .regex(
    /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
    'image must be a base64 data URL (data:image/...;base64,...)'
  )

const PalmPointSchema = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])
const PalmLinePointsSchema = z.array(PalmPointSchema).max(40)
const PalmLineScoreSchema = z.number().int().min(0).max(100)
const PalmLineTextSchema = z.string().trim().min(1)

const PalmLineMapShape = {
  heart: PalmLinePointsSchema,
  head: PalmLinePointsSchema,
  life: PalmLinePointsSchema,
  fate: PalmLinePointsSchema,
} as const

const PalmLineScoreMapShape = {
  heart: PalmLineScoreSchema,
  head: PalmLineScoreSchema,
  life: PalmLineScoreSchema,
  fate: PalmLineScoreSchema,
} as const

const PalmLineTextMapShape = {
  heart: PalmLineTextSchema,
  head: PalmLineTextSchema,
  life: PalmLineTextSchema,
  fate: PalmLineTextSchema,
} as const

const PalmConfidenceMapShape = {
  heart: z.number().min(0).max(1),
  head: z.number().min(0).max(1),
  life: z.number().min(0).max(1),
  fate: z.number().min(0).max(1),
} as const

export const PalmLineMapSchema = z.object(PalmLineMapShape)
export const PalmLineScoreMapSchema = z.object(PalmLineScoreMapShape)
export const PalmLineTextMapSchema = z.object(PalmLineTextMapShape)
export const PalmConfidenceMapSchema = z.object(PalmConfidenceMapShape)

export const PalmDetectRequestSchema = z.object({
  image: PalmImageDataUrlSchema,
  side: PalmSideSchema.optional(),
  imageWidth: z.number().int().positive().max(10000).optional(),
  imageHeight: z.number().int().positive().max(10000).optional(),
})

const PalmModelSchema = z.object({
  provider: z.string(),
  name: z.string(),
})

export const PalmDetectSuccessSchema = z.object({
  hasPalm: z.literal(true),
  lines: PalmLineMapSchema,
  confidence: PalmConfidenceMapSchema,
  model: PalmModelSchema,
})

export const PalmDetectNoPalmSchema = z.object({
  hasPalm: z.literal(false),
  reason: z.string().trim().min(1),
  model: PalmModelSchema,
})

export const PalmDetectResponseSchema = z.union([PalmDetectSuccessSchema, PalmDetectNoPalmSchema])

export const PalmInterpretRequestSchema = z.object({
  side: PalmSideSchema,
  lines: PalmLineMapSchema,
  confidence: PalmConfidenceMapSchema,
})

const PalmLineInterpretationSchema = z.object({
  score: PalmLineScoreSchema,
  summary: PalmLineTextSchema,
  metrics: z.object({
    length: z.number().min(0),
    depth: z.number().min(0).max(1),
    curvature: z.number().min(0),
  }),
})

export const PalmInterpretResponseSchema = z.object({
  core: z.object({
    lineScore: PalmLineScoreMapSchema,
    lineSuggestion: PalmLineTextMapSchema,
  }),
  insights: z.object({
    emotionalType: z.string().trim().min(1),
    cognitiveStyle: z.string().trim().min(1),
    vitality: z.string().trim().min(1),
    careerFocus: z.string().trim().min(1),
  }),
  lines: z.object({
    heart: PalmLineInterpretationSchema,
    head: PalmLineInterpretationSchema,
    life: PalmLineInterpretationSchema,
    fate: PalmLineInterpretationSchema,
  }),
})

export const PalmScanRequestSchema = z.object({
  clientId: z.string().trim().min(1).max(128).optional(),
  side: PalmSideSchema,
  image: PalmImageDataUrlSchema,
  imageWidth: z.number().int().positive().max(10000).optional(),
  imageHeight: z.number().int().positive().max(10000).optional(),
})

export const PalmScanRecordSchema = z.object({
  scanId: z.string().uuid(),
  clientId: z.string().trim().min(1).max(128),
  side: PalmSideSchema,
  createdAt: z.string().datetime(),
  detect: PalmDetectSuccessSchema,
  interpret: PalmInterpretResponseSchema,
})

export const PalmScanResponseSchema = PalmScanRecordSchema

export const PalmHistoryQuerySchema = z.object({
  clientId: z.string().trim().min(1).max(128),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export const PalmHistoryItemSchema = z.object({
  scanId: z.string().uuid(),
  side: PalmSideSchema,
  createdAt: z.string().datetime(),
  lineScore: PalmLineScoreMapSchema,
  insights: PalmInterpretResponseSchema.shape.insights,
})

export const PalmHistoryResponseSchema = z.object({
  items: z.array(PalmHistoryItemSchema),
})

export type PalmLineId = (typeof PALM_LINE_IDS)[number]
export type PalmLineMap = z.infer<typeof PalmLineMapSchema>
export type PalmConfidenceMap = z.infer<typeof PalmConfidenceMapSchema>
export type PalmDetectResponse = z.infer<typeof PalmDetectResponseSchema>
export type PalmDetectSuccess = z.infer<typeof PalmDetectSuccessSchema>
export type PalmDetectNoPalm = z.infer<typeof PalmDetectNoPalmSchema>
export type PalmInterpretRequest = z.infer<typeof PalmInterpretRequestSchema>
export type PalmInterpretResponse = z.infer<typeof PalmInterpretResponseSchema>
export type PalmScanRequest = z.infer<typeof PalmScanRequestSchema>
export type PalmScanRecord = z.infer<typeof PalmScanRecordSchema>
export type PalmScanResponse = z.infer<typeof PalmScanResponseSchema>
export type PalmHistoryResponse = z.infer<typeof PalmHistoryResponseSchema>
