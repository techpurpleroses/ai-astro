import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { searchLocations, getActiveProvider } from "@/lib/location";

export const runtime = "nodejs";
const logger = createServerLogger("api.location.autocomplete");

const QuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(8).optional(),
});

export async function GET(req: NextRequest) {
  return observeApiRoute({
    scope: "api.location.autocomplete.GET",
    request: req,
    handler: async () => {
      try {
        const url = new URL(req.url);
        const query = QuerySchema.parse({
          q: url.searchParams.get("q") ?? "",
          limit: url.searchParams.get("limit") ?? undefined,
        });

        logger.info("request.validated", {
          q: query.q,
          limit: query.limit ?? 7,
          activeProvider: getActiveProvider(),
        });

        const { suggestions, provider } = await searchLocations(query.q, query.limit ?? 7);

        return NextResponse.json({
          suggestions,
          meta: {
            configured: true,
            provider,
          },
        });
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
