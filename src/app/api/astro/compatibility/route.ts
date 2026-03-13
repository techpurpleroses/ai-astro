import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AppError } from "@/server/foundation/errors";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";

export const runtime = "nodejs";

const CompatibilityQuerySchema = z.object({
  signA: z.string().min(2),
  signB: z.string().min(2),
  systemType: z
    .enum(["western", "vedic", "chinese", "indian_lunar", "indian_solar", "mayan", "druid"])
    .default("western"),
  traceId: z.string().min(8).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const parsed = CompatibilityQuerySchema.parse({
      signA: req.nextUrl.searchParams.get("signA") ?? undefined,
      signB: req.nextUrl.searchParams.get("signB") ?? undefined,
      systemType: req.nextUrl.searchParams.get("systemType") ?? undefined,
      traceId: req.nextUrl.searchParams.get("traceId") ?? undefined,
    });

    const services = getAstroAiRuntime();
    const response = await services.compatibilityService.getCompatibility({
      signA: parsed.signA,
      signB: parsed.signB,
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
    console.error("api/astro/compatibility error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

