import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import {
  CompleteOnboardingSessionRequestSchema,
} from "@/lib/onboarding/contracts";
import { completeOnboardingSession } from "@/lib/onboarding/store";

export const runtime = "nodejs";
const logger = createServerLogger("api.onboarding.session.complete");

const SessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return observeApiRoute({
    scope: "api.onboarding.session.complete.POST",
    request: req,
    handler: async () => {
      try {
        const params = SessionParamsSchema.parse(await ctx.params);
        const body = await req.json();
        const input = CompleteOnboardingSessionRequestSchema.parse(body);
        logger.info("request.validated", {
          sessionId: params.sessionId,
          hasLeadEmail: Boolean(input.leadEmail),
          hasLeadPhone: Boolean(input.leadPhone),
        });
        const session = await completeOnboardingSession(params.sessionId, input);
        if (!session) {
          return NextResponse.json({ error: "not_found" }, { status: 404 });
        }
        return NextResponse.json({
          ok: true,
          sessionId: session.sessionId,
          status: session.status,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          logger.warn("request.invalid", { error });
          return NextResponse.json(
            { error: "invalid_request", details: error.flatten() },
            { status: 400 }
          );
        }
        const reason = error instanceof Error ? error.message : String(error);
        logger.error("request.error", { error, reason });
        return NextResponse.json(
          { error: "server_error", details: { reason } },
          { status: 500 }
        );
      }
    },
  });
}
