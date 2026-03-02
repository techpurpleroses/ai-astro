import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { detectPalmLines } from '@/lib/palm/detect'
import { PalmDetectRequestSchema } from '@/lib/palm/contracts'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = PalmDetectRequestSchema.parse(body)
    const result = await detectPalmLines(input.image)

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
