import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { detectPalmLines } from '@/lib/palm/detect'
import { PalmDetectRequestSchema } from '@/lib/palm/contracts'

export const runtime = 'nodejs'
const PALM_DEBUG = process.env.PALM_DEBUG !== '0'

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  try {
    const body = await req.json()
    const input = PalmDetectRequestSchema.parse(body)
    if (PALM_DEBUG) {
      console.log('[api/palm/detect] request.received', {
        side: input.side ?? 'unknown',
        imageChars: input.image.length,
        imageWidth: input.imageWidth ?? null,
        imageHeight: input.imageHeight ?? null,
      })
    }
    const result = await detectPalmLines(input.image, input.side, {
      imageWidth: input.imageWidth,
      imageHeight: input.imageHeight,
    })
    if (PALM_DEBUG) {
      console.log('[api/palm/detect] detect.done', {
        ms: Date.now() - startedAt,
        hasPalm: result.hasPalm,
        model: result.model,
      })
    }

    if (!result.hasPalm) {
      return NextResponse.json(result, { status: 422 })
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_request', details: error.flatten() }, { status: 400 })
    }
    console.error('palm.detect error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

