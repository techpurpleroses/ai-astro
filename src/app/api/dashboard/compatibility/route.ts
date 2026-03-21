import { NextRequest, NextResponse } from "next/server";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import compatibilityContent from "@/data/compatibility.json";

export const runtime = "nodejs";
const logger = createServerLogger("api.dashboard.compatibility");

// GET /api/dashboard/compatibility
// Returns curated editorial content for the Compatibility tab:
//   - bestMatches: top compatible signs per sign
//   - todaysMatches: featured pairs by category (love/career/friendship/sex)
//
// Per-pair live scores are served by GET /api/astro/compatibility.
// No auth required — this is static content, same for all users.

export async function GET(req: NextRequest) {
  return observeApiRoute({
    scope: "api.dashboard.compatibility.GET",
    request: req,
    handler: async () => {
      logger.info("request.ok");
      // Strip `pairs` — those are now served by the live /api/astro/compatibility endpoint
      const { pairs: _pairs, ...content } = compatibilityContent;
      return NextResponse.json(content, { status: 200 });
    },
  });
}
