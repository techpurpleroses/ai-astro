import type { LocationSuggestion } from "./mapbox";
import { BRAND_USER_AGENT } from "@/lib/brand";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = BRAND_USER_AGENT;
const DEFAULT_LIMIT = 7;
const logger = createServerLogger("location.nominatim");

interface NominatimResult {
  place_id: number;
  osm_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    region?: string;
    county?: string;
    country?: string;
    country_code?: string;
  };
}

function toLocationSuggestion(result: NominatimResult): LocationSuggestion | null {
  const latitude = parseFloat(result.lat);
  const longitude = parseFloat(result.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const addr = result.address ?? {};
  const city =
    addr.city || addr.town || addr.village || addr.municipality || result.display_name.split(",")[0].trim();
  const region = addr.state || addr.region || addr.county || undefined;
  const country = addr.country || result.display_name.split(",").at(-1)?.trim() || "Unknown";
  const countryCode = addr.country_code?.toUpperCase() || undefined;

  const label = region ? `${city}, ${country}` : `${city}, ${country}`;
  const fullName = result.display_name;

  return {
    id: `nominatim:${result.place_id}`,
    label,
    fullName,
    city,
    region,
    country,
    countryCode,
    latitude,
    longitude,
    provider: "nominatim",
  };
}

export async function searchGlobalLocationsNominatim(
  query: string,
  limit = DEFAULT_LIMIT
): Promise<LocationSuggestion[]> {
  const startedAt = Date.now();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  logger.info("search.start", {
    query: trimmed,
    limit,
  });

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(Math.min(limit, 10)));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("featuretype", "city");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en",
    },
    next: { revalidate: 300 }, // 5-min cache
  });

  if (!response.ok) {
    logger.warn("search.failed", {
      durationMs: durationMs(startedAt),
      outcome: "failure",
      query: trimmed,
      limit,
      status: response.status,
    });
    return [];
  }

  const results: NominatimResult[] = await response.json();

  const dedupe = new Map<string, LocationSuggestion>();
  for (const result of results) {
    const suggestion = toLocationSuggestion(result);
    if (!suggestion) continue;
    const key = `${suggestion.label.toLowerCase()}::${suggestion.countryCode ?? ""}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, suggestion);
    }
  }

  const suggestions = Array.from(dedupe.values());
  logger.info("search.success", {
    durationMs: durationMs(startedAt),
    outcome: "success",
    query: trimmed,
    limit,
    count: suggestions.length,
  });
  return suggestions;
}
