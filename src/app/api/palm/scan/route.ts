import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { detectPalmLines } from '@/lib/palm/detect'
import { interpretPalmScan } from '@/lib/palm/interpret'
import { normalizeClientId, savePalmScanRecord } from '@/lib/palm/store'
import { PalmScanRecordSchema, PalmScanRequestSchema } from '@/lib/palm/contracts'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = PalmScanRequestSchema.parse(body)

    const detect = await detectPalmLines(input.image)
    if (!detect.hasPalm) {
      return NextResponse.json({ error: 'no_palm', details: detect }, { status: 422 })
    }

    const interpret = interpretPalmScan({
      side: input.side,
      lines: detect.lines,
      confidence: detect.confidence,
    })

    const record = PalmScanRecordSchema.parse({
      scanId: randomUUID(),
      clientId: normalizeClientId(input.clientId),
      side: input.side,
      createdAt: new Date().toISOString(),
      detect,
      interpret,
    })

    await savePalmScanRecord(record)
    return NextResponse.json(record)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_request', details: error.flatten() }, { status: 400 })
    }
    console.error('palm.scan error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
