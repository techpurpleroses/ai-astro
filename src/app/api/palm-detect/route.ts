import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerLogger } from '@/server/foundation/observability/logger'
import { observeApiRoute } from '@/server/foundation/observability/route'
import { PalmDetectRequestSchema } from '@/lib/palm/contracts'
import { detectPalmLines } from '@/lib/palm/detect'

export const runtime = 'nodejs'
const logger = createServerLogger('api.palm-detect')

export async function POST(req: NextRequest) {
  return observeApiRoute({
    scope: 'api.palm-detect.POST',
    request: req,
    handler: async () => {
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

        if (!result.hasPalm) {
          return NextResponse.json({ error: 'no_palm', details: result }, { status: 422 })
        }

        return NextResponse.json(result.lines)
      } catch (err) {
        if (err instanceof ZodError) {
          logger.warn('request.invalid', { error: err })
          return NextResponse.json({ error: 'invalid_request', details: err.flatten() }, { status: 400 })
        }

        logger.error('request.error', { error: err })
        return NextResponse.json({ error: 'server_error' }, { status: 500 })
      }
    },
  })
}

