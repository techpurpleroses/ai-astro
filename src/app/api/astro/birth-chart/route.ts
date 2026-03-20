import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getObservabilityTraceId } from "@/server/foundation/observability/context";
import { AppError } from "@/server/foundation/errors";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getCachedEntitlement, entitlementAllows } from "@/server/foundation/modules/billing/cached-entitlement";
import { softPaywallResponse } from "@/server/foundation/modules/billing/entitlement-check";
import { checkRateLimitForUser } from "@/server/foundation/modules/billing/rate-limiter";

export const runtime = "nodejs";
const logger = createServerLogger("api.astro.birth-chart");

const BirthChartBodySchema = z.object({
  userId: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  chartType: z.string().min(2).default("natal"),
  systemType: z
    .enum(["western", "vedic", "chinese", "indian_lunar", "indian_solar", "mayan", "druid"])
    .default("western"),
  traceId: z.string().min(8).optional(),
});

export async function POST(req: NextRequest) {
  return observeApiRoute({
    scope: "api.astro.birth-chart.POST",
    request: req,
    handler: async () => {
      try {
        const supabase = await getServerSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          logger.warn("request.unauthorized");
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        // Entitlement check — cached per user, 5-min TTL, busted on subscription events
        const entitlement = await getCachedEntitlement(user.id)();
        if (!entitlementAllows(entitlement.tier, "birth_chart.full")) {
          logger.info("request.gated", { planCode: entitlement.planCode });
          return NextResponse.json(
            softPaywallResponse("birth_chart.full", entitlement.planCode),
            { status: 200 }
          );
        }

        // Global daily rate limit — checked after feature gate
        const rateLimit = await checkRateLimitForUser(user.id, entitlement.planCode);
        if (!rateLimit.allowed) {
          logger.warn("request.rate_limited", { userId: user.id, count: rateLimit.count, limit: rateLimit.limit });
          return NextResponse.json(
            { error: "rate_limit_exceeded", limit: rateLimit.limit, retryAfter: "tomorrow" },
            { status: 429 }
          );
        }

        const body = await req.json();
        const parsed = BirthChartBodySchema.parse(body);
        logger.info("request.validated", {
          userId: user.id,
          subjectId: parsed.subjectId,
          chartType: parsed.chartType,
          systemType: parsed.systemType,
        });

        const services = getAstroAiRuntime();
        const response = await services.birthChartService.getBirthChart({
          userId: user.id,
          subjectId: parsed.subjectId,
          chartType: parsed.chartType,
          systemType: parsed.systemType,
          traceId: parsed.traceId ?? getObservabilityTraceId() ?? randomUUID(),
        });

        return NextResponse.json(response, { status: 200 });
      } catch (error) {
        if (error instanceof ZodError) {
          logger.warn("request.invalid", { error });
          return NextResponse.json(
            { error: "invalid_request", details: error.flatten() },
            { status: 400 }
          );
        }
        if (error instanceof AppError) {
          logger.warn("request.app_error", { code: error.code, status: error.status });
          return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
        }
        logger.error("request.error", { error });
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    },
  });
}
