import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { detectPalmLines } from "@/lib/palm/detect";
import { interpretPalmScan } from "@/lib/palm/interpret";
import { normalizeClientId, savePalmScanRecord } from "@/lib/palm/store";
import { PalmScanRecordSchema, PalmScanRequestSchema } from "@/lib/palm/contracts";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getCachedEntitlement, entitlementAllows } from "@/server/foundation/modules/billing/cached-entitlement";
import { softPaywallResponse } from "@/server/foundation/modules/billing/entitlement-check";
import { checkRateLimitForUser } from "@/server/foundation/modules/billing/rate-limiter";

export const runtime = "nodejs";
export const maxDuration = 60;

const logger = createServerLogger("api.palm.scan");

export async function POST(req: NextRequest) {
  return observeApiRoute({
    scope: "api.palm.scan.POST",
    request: req,
    handler: async () => {
      const startedAt = Date.now();

      try {
        // Auth + entitlement check
        const supabase = await getServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          logger.warn("request.unauthorized");
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        const entitlement = await getCachedEntitlement(user.id)();
        if (!entitlementAllows(entitlement.tier, "palm.scan")) {
          logger.info("request.gated", { planCode: entitlement.planCode });
          return NextResponse.json(
            softPaywallResponse("palm.scan", entitlement.planCode),
            { status: 200 }
          );
        }

        // Global daily rate limit
        const rateLimit = await checkRateLimitForUser(user.id, entitlement.planCode);
        if (!rateLimit.allowed) {
          logger.warn("request.rate_limited", { userId: user.id, count: rateLimit.count, limit: rateLimit.limit });
          return NextResponse.json(
            { error: "rate_limit_exceeded", limit: rateLimit.limit, retryAfter: "tomorrow" },
            { status: 429 }
          );
        }

        const body = await req.json();
        const input = PalmScanRequestSchema.parse(body);
        logger.info("request.validated", {
          side: input.side,
          clientId: input.clientId ?? "generated",
          imageChars: input.image.length,
          imageWidth: input.imageWidth ?? null,
          imageHeight: input.imageHeight ?? null,
        });

        const detectStartedAt = Date.now();
        const detect = await detectPalmLines(input.image, input.side, {
          imageWidth: input.imageWidth,
          imageHeight: input.imageHeight,
        });
        logger.info("detect.done", {
          durationMs: durationMs(detectStartedAt),
          outcome: detect.hasPalm ? "success" : "no_palm",
          hasPalm: detect.hasPalm,
          model: detect.model,
        });

        if (!detect.hasPalm) {
          logger.warn("response.no_palm", {
            durationMs: durationMs(startedAt),
            reason: detect.reason,
          });
          return NextResponse.json({ error: "no_palm", details: detect }, { status: 422 });
        }

        const interpretStartedAt = Date.now();
        const interpret = await interpretPalmScan({
          side: input.side,
          lines: detect.lines,
          confidence: detect.confidence,
        });
        logger.info("interpret.done", {
          durationMs: durationMs(interpretStartedAt),
          outcome: "success",
          score: interpret.core.lineScore,
        });

        const record = PalmScanRecordSchema.parse({
          scanId: randomUUID(),
          clientId: normalizeClientId(input.clientId),
          side: input.side,
          createdAt: new Date().toISOString(),
          detect,
          interpret,
        });

        const saveStartedAt = Date.now();
        try {
          await savePalmScanRecord(record);
          logger.info("store.done", {
            durationMs: durationMs(saveStartedAt),
            outcome: "success",
            scanId: record.scanId,
          });
        } catch (error) {
          logger.error("store.fail", {
            durationMs: durationMs(saveStartedAt),
            scanId: record.scanId,
            error,
          });
        }

        logger.info("response.success", {
          durationMs: durationMs(startedAt),
          outcome: "success",
          scanId: record.scanId,
        });
        return NextResponse.json(record);
      } catch (error) {
        if (error instanceof ZodError) {
          logger.warn("request.invalid", {
            durationMs: durationMs(startedAt),
            error,
          });
          return NextResponse.json({ error: "invalid_request", details: error.flatten() }, { status: 400 });
        }

        const reason = error instanceof Error ? error.message : String(error);
        logger.error("request.error", {
          durationMs: durationMs(startedAt),
          reason,
          error,
        });
        return NextResponse.json({ error: "server_error", details: { reason } }, { status: 500 });
      }
    },
  });
}
