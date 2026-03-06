import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { PalmDetectRequestSchema } from '@/lib/palm/contracts'
import { detectPalmLines } from '@/lib/palm/detect'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = PalmDetectRequestSchema.parse(body)
    const result = await detectPalmLines(input.image, input.side, {
      imageWidth: input.imageWidth,
      imageHeight: input.imageHeight,
    })

    if (!result.hasPalm) {
      return NextResponse.json({ error: 'no_palm', details: result }, { status: 422 })
    }

    // Backward-compatible shape for old callers.
    return NextResponse.json(result.lines)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_request', details: err.flatten() }, { status: 400 })
    }

    console.error('palm-detect error:', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

