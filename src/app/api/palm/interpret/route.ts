import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { PalmInterpretRequestSchema } from '@/lib/palm/contracts'
import { interpretPalmScan } from '@/lib/palm/interpret'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = PalmInterpretRequestSchema.parse(body)
    const result = interpretPalmScan(input)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_request', details: error.flatten() }, { status: 400 })
    }
    console.error('palm.interpret error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
