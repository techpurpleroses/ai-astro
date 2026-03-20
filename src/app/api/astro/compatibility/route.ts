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

export const runtime = "nodejs";
const logger = createServerLogger("api.astro.compatibility");

const CompatibilityQuerySchema = z.object({
  signA: z.string().min(2),
  signB: z.string().min(2),
  systemType: z
    .enum(["western", "vedic", "chinese", "indian_lunar", "indian_solar", "mayan", "druid"])
    .default("western"),
  traceId: z.string().min(8).optional(),
});

export async function GET(req: NextRequest) {
  return observeApiRoute({
    scope: "api.astro.compatibility.GET",
    request: req,
    handler: async () => {
      try {
        // Auth check
        const supabase = await getServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          logger.warn("request.unauthorized");
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        // Entitlement check — cached per user, 5-min TTL, busted on subscription events
        const entitlement = await getCachedEntitlement(user.id)();
        if (!entitlementAllows(entitlement.tier, "compatibility.deep")) {
          logger.info("request.gated", { planCode: entitlement.planCode });
          return NextResponse.json(
            softPaywallResponse("compatibility.deep", entitlement.planCode),
            { status: 200 }  // 200 not 403 — frontend reads locked:true
          );
        }

        const parsed = CompatibilityQuerySchema.parse({
          signA: req.nextUrl.searchParams.get("signA") ?? undefined,
          signB: req.nextUrl.searchParams.get("signB") ?? undefined,
          systemType: req.nextUrl.searchParams.get("systemType") ?? undefined,
          traceId: req.nextUrl.searchParams.get("traceId") ?? undefined,
        });

        logger.info("request.validated", {
          signA: parsed.signA,
          signB: parsed.signB,
          systemType: parsed.systemType,
        });

        const services = getAstroAiRuntime();
        const response = await services.compatibilityService.getCompatibility({
          signA: parsed.signA,
          signB: parsed.signB,
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
