import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { PalmInterpretRequestSchema } from '@/lib/palm/contracts'
import { interpretPalmScan } from '@/lib/palm/interpret'

export const runtime = 'nodejs'
const PALM_DEBUG = process.env.PALM_DEBUG !== '0'

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  try {
    const body = await req.json()
    const input = PalmInterpretRequestSchema.parse(body)
    if (PALM_DEBUG) {
      console.log('[api/palm/interpret] request.received', { side: input.side, confidence: input.confidence })
    }
    const result = await interpretPalmScan(input)
    if (PALM_DEBUG) {
      console.log('[api/palm/interpret] interpret.done', {
        ms: Date.now() - startedAt,
        score: result.core.lineScore,
      })
    }
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_request', details: error.flatten() }, { status: 400 })
    }
    console.error('palm.interpret error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

