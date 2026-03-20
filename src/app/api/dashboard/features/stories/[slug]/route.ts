import { NextRequest, NextResponse } from "next/server";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { AppError } from "@/server/foundation/errors";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";

export const runtime = "nodejs";
const logger = createServerLogger("api.dashboard.features.stories.slug");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return observeApiRoute({
    scope: "api.dashboard.features.stories.slug.GET",
    request: req,
    handler: async () => {
      try {
        const { slug } = await params;
        logger.info("request.params", { slug });
        const { storiesService } = getAstroAiRuntime();
        const article = await storiesService.getArticle(slug);
        return NextResponse.json({ article }, { status: 200 });
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
