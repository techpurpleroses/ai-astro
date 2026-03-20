import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getObservabilityTraceId } from "@/server/foundation/observability/context";
import { AppError } from "@/server/foundation/errors";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";

export const runtime = "nodejs";
const logger = createServerLogger("api.dashboard.horoscope");

const VALID_SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

const HoroscopeQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  systemType: z
    .enum(["western", "vedic", "chinese", "indian_lunar", "indian_solar", "mayan", "druid"])
    .default("western"),
  sign: z.enum(VALID_SIGNS),
  traceId: z.string().min(8).optional(),
});

function utcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  return observeApiRoute({
    scope: "api.dashboard.horoscope.GET",
    request: req,
    handler: async () => {
      try {
        const parsed = HoroscopeQuerySchema.parse({
          date: req.nextUrl.searchParams.get("date") ?? undefined,
          systemType: req.nextUrl.searchParams.get("systemType") ?? undefined,
          sign: req.nextUrl.searchParams.get("sign") ?? undefined,
          traceId: req.nextUrl.searchParams.get("traceId") ?? undefined,
        });

        logger.info("request.validated", {
          sign: parsed.sign,
          date: parsed.date ?? utcDateString(),
          systemType: parsed.systemType,
        });

        const { horoscopeService } = getAstroAiRuntime();
        const response = await horoscopeService.getHoroscope({
          date: parsed.date ?? utcDateString(),
          systemType: parsed.systemType,
          sign: parsed.sign,
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
