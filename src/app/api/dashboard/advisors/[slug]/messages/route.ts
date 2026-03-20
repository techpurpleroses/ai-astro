import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { AppError } from "@/server/foundation/errors";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { BillingService } from "@/server/foundation/modules/billing/service";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase/service-role-client";

export const runtime = "nodejs";
const logger = createServerLogger("api.dashboard.advisors.messages");

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
});

async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = await getServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return observeApiRoute({
    scope: "api.dashboard.advisors.messages.GET",
    request: req,
    handler: async () => {
      try {
        const userId = await getAuthUserId();
        if (!userId) {
          logger.warn("request.unauthorized");
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const { slug } = await params;
        logger.info("request.params", { userId, slug });
        const { chatService } = getAstroAiRuntime();
        const result = await chatService.getHistory(userId, slug);
        return NextResponse.json(result, { status: 200 });
      } catch (error) {
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return observeApiRoute({
    scope: "api.dashboard.advisors.messages.POST",
    request: req,
    handler: async () => {
      try {
        const userId = await getAuthUserId();
        if (!userId) {
          logger.warn("request.unauthorized");
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const { slug } = await params;
        const body = await req.json();
        const parsed = SendMessageSchema.parse(body);
        logger.info("request.validated", {
          userId,
          slug,
          hasSessionId: Boolean(parsed.sessionId),
          contentChars: parsed.content.length,
        });

        // Atomically deduct 1 credit before calling AI
        const billing = new BillingService(getServiceRoleSupabaseClient());
        const { deducted, balanceAfter } = await billing.deductCredit(userId);
        if (!deducted) {
          logger.warn("request.insufficient_credits", { userId });
          return NextResponse.json(
            { error: "insufficient_credits", creditBalance: 0 },
            { status: 402 }
          );
        }
        logger.info("credit.deducted", { userId, balanceAfter });

        // Call AI — refund on failure so user is not charged for broken sessions
        const { chatService } = getAstroAiRuntime();
        let result;
        try {
          result = await chatService.sendMessage({
            userId,
            advisorSlug: slug,
            content: parsed.content,
            sessionId: parsed.sessionId,
          });
        } catch (aiError) {
          // Refund the credit — AI call failed
          await billing.refundCredit(userId, "ai_failure").catch(() => {});
          logger.error("chat.ai_failure_refunded", { userId, aiError });
          throw aiError;
        }

        return NextResponse.json({ ...result, creditBalance: balanceAfter }, { status: 200 });
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
