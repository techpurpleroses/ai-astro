import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AppError } from "@/server/foundation/errors";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";

export const runtime = "nodejs";

const TodayQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  systemType: z
    .enum(["western", "vedic", "chinese", "indian_lunar", "indian_solar", "mayan", "druid"])
    .default("western"),
  traceId: z.string().min(8).optional(),
});

function utcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const parsed = TodayQuerySchema.parse({
      date: req.nextUrl.searchParams.get("date") ?? undefined,
      systemType: req.nextUrl.searchParams.get("systemType") ?? undefined,
      traceId: req.nextUrl.searchParams.get("traceId") ?? undefined,
    });

    const services = getAstroAiRuntime();
    const response = await services.todayService.getToday({
      date: parsed.date ?? utcDateString(),
      systemType: parsed.systemType,
      traceId: parsed.traceId ?? randomUUID(),
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "invalid_request", details: error.flatten() },
        { status: 400 }
      );
    }
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    console.error("api/astro/today error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

