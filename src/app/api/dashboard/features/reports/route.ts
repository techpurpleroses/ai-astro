import { NextRequest, NextResponse } from "next/server";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { AppError } from "@/server/foundation/errors";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";

export const runtime = "nodejs";
const logger = createServerLogger("api.dashboard.features.reports");

export async function GET(req: NextRequest) {
  return observeApiRoute({
    scope: "api.dashboard.features.reports.GET",
    request: req,
    handler: async () => {
      try {
        const { reportsService } = getAstroAiRuntime();
        const result = await reportsService.listProducts();
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
