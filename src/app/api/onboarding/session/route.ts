import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import {
  CreateOnboardingSessionRequestSchema,
} from "@/lib/onboarding/contracts";
import { createOnboardingSession } from "@/lib/onboarding/store";

export const runtime = "nodejs";
const logger = createServerLogger("api.onboarding.session");

export async function POST(req: NextRequest) {
  return observeApiRoute({
    scope: "api.onboarding.session.POST",
    request: req,
    handler: async () => {
      try {
        const body = await req.json();
        const input = CreateOnboardingSessionRequestSchema.parse(body);
        logger.info("request.validated", {
          category: input.category,
          source: input.source ?? null,
          campaign: input.campaign ?? null,
        });
        const session = await createOnboardingSession(input);
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
