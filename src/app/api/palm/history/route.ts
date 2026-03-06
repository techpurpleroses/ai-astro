import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { listPalmScanRecords, normalizeClientId } from '@/lib/palm/store'
import { PalmHistoryQuerySchema, PalmHistoryResponseSchema } from '@/lib/palm/contracts'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams
    const input = PalmHistoryQuerySchema.parse({
      clientId: search.get('clientId'),
      limit: search.get('limit') ?? undefined,
    })

    const rows = await listPalmScanRecords(normalizeClientId(input.clientId), input.limit)
    const response = PalmHistoryResponseSchema.parse({
      items: rows.map((row) => ({
        scanId: row.scanId,
        side: row.side,
        createdAt: row.createdAt,
        lineScore: row.interpret.core.lineScore,
        insights: row.interpret.insights,
      })),
    })

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'invalid_request', details: error.flatten() }, { status: 400 })
    }
    console.error('palm.history error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

