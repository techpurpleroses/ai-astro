import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import {
  UpdateOnboardingSessionRequestSchema,
} from "@/lib/onboarding/contracts";
import {
  getOnboardingSession,
  updateOnboardingSession,
} from "@/lib/onboarding/store";

export const runtime = "nodejs";
const logger = createServerLogger("api.onboarding.session.detail");

const SessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return observeApiRoute({
    scope: "api.onboarding.session.detail.GET",
    request: req,
    handler: async () => {
      try {
        const params = SessionParamsSchema.parse(await ctx.params);
        logger.info("request.params", { sessionId: params.sessionId });
        const session = await getOnboardingSession(params.sessionId);
        if (!session) {
          return NextResponse.json({ error: "not_found" }, { status: 404 });
        }
        return NextResponse.json(session);
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

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return observeApiRoute({
    scope: "api.onboarding.session.detail.PATCH",
    request: req,
    handler: async () => {
      try {
        const params = SessionParamsSchema.parse(await ctx.params);
        const body = await req.json();
        const input = UpdateOnboardingSessionRequestSchema.parse(body);
        logger.info("request.validated", {
          sessionId: params.sessionId,
          currentStep: input.currentStep ?? null,
          status: input.status ?? null,
          eventType: input.event?.type ?? null,
        });
        const session = await updateOnboardingSession(params.sessionId, input);
        if (!session) {
          return NextResponse.json({ error: "not_found" }, { status: 404 });
        }
        return NextResponse.json(session);
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
