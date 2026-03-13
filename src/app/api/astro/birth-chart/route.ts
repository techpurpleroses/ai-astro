import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AppError } from "@/server/foundation/errors";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  try {
    const supabase = await getServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = BirthChartBodySchema.parse(body);

    const services = getAstroAiRuntime();
    const response = await services.birthChartService.getBirthChart({
      userId: user.id,
      subjectId: parsed.subjectId,
      chartType: parsed.chartType,
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
    console.error("api/astro/birth-chart error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
