import { NextRequest, NextResponse } from "next/server";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { getAllOnboardingAssetManifests } from "@/lib/onboarding/assets";
import {
  ONBOARDING_CATEGORIES,
  ONBOARDING_CONFIG,
} from "@/lib/onboarding/config";
import { getCategoryMediaMap } from "@/lib/onboarding/media-map";

export const runtime = "nodejs";
const logger = createServerLogger("api.onboarding.assets.report");

export async function GET(req: NextRequest) {
  return observeApiRoute({
    scope: "api.onboarding.assets.report.GET",
    request: req,
    handler: async () => {
      try {
        const manifests = await getAllOnboardingAssetManifests();
        const report = ONBOARDING_CATEGORIES.map((slug) => {
          const config = ONBOARDING_CONFIG[slug];
          const manifest = manifests[slug];
          const mediaMap = getCategoryMediaMap(slug);
          const stepPreview = mediaMap.map((entry, idx) => ({
            step: idx + 1,
            mediaKind: entry.kind,
            mediaIndex: entry.index,
          }));
          const missingMappedVideo =
            mediaMap.filter((entry) => entry.kind === "video").length > 0 &&
            manifest.videos.length === 0;

          return {
            category: slug,
            configuredSteps: config.steps.length,
            mappedSteps: mediaMap.length,
            images: manifest.images.length,
            videos: manifest.videos.length,
            audio: manifest.audio.length,
            fonts: manifest.fonts.length,
            hasEnoughMedia: manifest.images.length > 0 || manifest.videos.length > 0,
            missingMappedVideo,
            stepPreview,
          };
        });

        logger.info("report.generated", { categoryCount: report.length });
        return NextResponse.json({
          generatedAt: new Date().toISOString(),
          categories: report,
        });
      } catch (error) {
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
