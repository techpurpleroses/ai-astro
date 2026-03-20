import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerLogger } from '@/server/foundation/observability/logger'
import { observeApiRoute } from '@/server/foundation/observability/route'
import { listPalmScanRecords, normalizeClientId } from '@/lib/palm/store'
import { PalmHistoryQuerySchema, PalmHistoryResponseSchema } from '@/lib/palm/contracts'

export const runtime = 'nodejs'
const logger = createServerLogger('api.palm.history')

export async function GET(req: NextRequest) {
  return observeApiRoute({
    scope: 'api.palm.history.GET',
    request: req,
    handler: async () => {
      try {
        const search = req.nextUrl.searchParams
        const input = PalmHistoryQuerySchema.parse({
          clientId: search.get('clientId'),
          limit: search.get('limit') ?? undefined,
        })

        logger.info('request.validated', {
          clientId: input.clientId,
          limit: input.limit,
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
          logger.warn('request.invalid', { error })
          return NextResponse.json({ error: 'invalid_request', details: error.flatten() }, { status: 400 })
        }
        logger.error('request.error', { error })
        return NextResponse.json({ error: 'server_error' }, { status: 500 })
      }
    },
  })
}

