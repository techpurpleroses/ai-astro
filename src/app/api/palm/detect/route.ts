import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerLogger, durationMs } from '@/server/foundation/observability/logger'
import { observeApiRoute } from '@/server/foundation/observability/route'
import { detectPalmLines } from '@/lib/palm/detect'
import { PalmDetectRequestSchema } from '@/lib/palm/contracts'

export const runtime = 'nodejs'
const logger = createServerLogger('api.palm.detect')

export async function POST(req: NextRequest) {
  return observeApiRoute({
    scope: 'api.palm.detect.POST',
    request: req,
    handler: async () => {
      const startedAt = Date.now()
      try {
        const body = await req.json()
        const input = PalmDetectRequestSchema.parse(body)
        logger.info('request.validated', {
          side: input.side ?? 'unknown',
          imageChars: input.image.length,
          imageWidth: input.imageWidth ?? null,
          imageHeight: input.imageHeight ?? null,
        })
        const result = await detectPalmLines(input.image, input.side, {
          imageWidth: input.imageWidth,
          imageHeight: input.imageHeight,
        })
        logger.info('detect.done', {
          durationMs: durationMs(startedAt),
          outcome: result.hasPalm ? 'success' : 'no_palm',
          hasPalm: result.hasPalm,
          model: result.model,
        })

        if (!result.hasPalm) {
          return NextResponse.json(result, { status: 422 })
        }

        return NextResponse.json(result)
      } catch (error) {
        if (error instanceof ZodError) {
          logger.warn('request.invalid', { error })
          return NextResponse.json({ error: 'invalid_request', details: error.flatten() }, { status: 400 })
        }
        logger.error('request.error', { error })
        return NextResponse.json({ error: 'server_error' }, { status: 500 })
      }
    },
  })
}

