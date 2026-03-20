import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerLogger, durationMs } from '@/server/foundation/observability/logger'
import { observeApiRoute } from '@/server/foundation/observability/route'
import { PalmInterpretRequestSchema } from '@/lib/palm/contracts'
import { interpretPalmScan } from '@/lib/palm/interpret'
import { getServerSupabaseClient } from '@/lib/supabase/server'
import { getCachedEntitlement, entitlementAllows } from '@/server/foundation/modules/billing/cached-entitlement'
import { softPaywallResponse } from '@/server/foundation/modules/billing/entitlement-check'
import { checkRateLimitForUser } from '@/server/foundation/modules/billing/rate-limiter'

export const runtime = 'nodejs'
const logger = createServerLogger('api.palm.interpret')

export async function POST(req: NextRequest) {
  return observeApiRoute({
    scope: 'api.palm.interpret.POST',
    request: req,
    handler: async () => {
      const startedAt = Date.now()
      try {
        // Auth + entitlement check
        const supabase = await getServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          logger.warn('request.unauthorized')
          return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        }
        const entitlement = await getCachedEntitlement(user.id)()
        if (!entitlementAllows(entitlement.tier, 'palm.scan')) {
          logger.info('request.gated', { planCode: entitlement.planCode })
          return NextResponse.json(
            softPaywallResponse('palm.scan', entitlement.planCode),
            { status: 200 }
          )
        }

        // Global daily rate limit
        const rateLimit = await checkRateLimitForUser(user.id, entitlement.planCode)
        if (!rateLimit.allowed) {
          logger.warn('request.rate_limited', { userId: user.id, count: rateLimit.count, limit: rateLimit.limit })
          return NextResponse.json(
            { error: 'rate_limit_exceeded', limit: rateLimit.limit, retryAfter: 'tomorrow' },
            { status: 429 }
          )
        }

        const body = await req.json()
        const input = PalmInterpretRequestSchema.parse(body)
        logger.info('request.validated', { side: input.side, confidence: input.confidence })
        const result = await interpretPalmScan(input)
        logger.info('interpret.done', {
          durationMs: durationMs(startedAt),
          outcome: 'success',
          score: result.core.lineScore,
        })
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

