import {
  hasMapboxAccessToken,
  searchGlobalLocations as searchMapbox,
  type LocationSuggestion,
} from "./mapbox";
import { searchGlobalLocationsNominatim } from "./nominatim";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";

export type { LocationSuggestion } from "./mapbox";

type Provider = "mapbox" | "nominatim";

function resolveProvider(): Provider {
  const forced = process.env.LOCATION_PROVIDER as Provider | undefined;
  if (forced === "mapbox" || forced === "nominatim") return forced;
  return hasMapboxAccessToken() ? "mapbox" : "nominatim";
}

export async function searchLocations(
  query: string,
  limit = 7
): Promise<{ suggestions: LocationSuggestion[]; provider: Provider }> {
  const logger = createServerLogger("location.search");
  const startedAt = Date.now();
  const provider = resolveProvider();
  logger.info("search.start", {
    provider,
    query,
    limit,
  });

  const suggestions: LocationSuggestion[] =
    provider === "mapbox"
      ? await searchMapbox({ query, limit })
      : await searchGlobalLocationsNominatim(query, limit);

  logger.info("search.success", {
    durationMs: durationMs(startedAt),
    outcome: "success",
    provider,
    count: suggestions.length,
  });
  return { suggestions, provider };
}

export function getActiveProvider(): Provider {
  return resolveProvider();
}
