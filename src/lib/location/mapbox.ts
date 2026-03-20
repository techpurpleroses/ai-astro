import mapboxSdk from "@mapbox/mapbox-sdk";
import mbxGeocoding, {
  type GeocodeFeature,
  type GeocodeQueryType,
} from "@mapbox/mapbox-sdk/services/geocoding";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_KEYS = 1500;
const DEFAULT_LIMIT = 7;
const MAX_LIMIT = 8;
const FORWARD_TYPES: GeocodeQueryType[] = [
  "place",
  "locality",
  "district",
  "region",
  "country",
];

export interface LocationSuggestion {
  id: string;
  label: string;
  fullName: string;
  city: string;
  region?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  provider: "mapbox" | "nominatim";
}

interface SearchGlobalLocationsInput {
  query: string;
  limit?: number;
  language?: string;
}

interface SuggestionCacheEntry {
  expiresAt: number;
  value: LocationSuggestion[];
}

const suggestionCache = new Map<string, SuggestionCacheEntry>();
let geocodingClient: ReturnType<typeof mbxGeocoding> | null = null;
const logger = createServerLogger("location.mapbox");

function readContext(feature: GeocodeFeature, type: string): GeocodeFeature | null {
  if (!Array.isArray(feature.context)) return null;
  for (const item of feature.context) {
    if (!item) continue;
    if (Array.isArray(item.place_type) && item.place_type.includes(type)) {
      return item;
    }
    if (typeof item.id === "string" && item.id.startsWith(`${type}.`)) {
      return item;
    }
  }
  return null;
}

function normalizeCountryCode(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const [primary] = value.split("-");
  const normalized = primary?.trim().toUpperCase();
  return normalized ? normalized : undefined;
}

function toLocationSuggestion(feature: GeocodeFeature): LocationSuggestion | null {
  const placeContext = readContext(feature, "place");
  const localityContext = readContext(feature, "locality");
  const districtContext = readContext(feature, "district");
  const regionContext = readContext(feature, "region");
  const countryContext = readContext(feature, "country");

  const city =
    (feature.place_type.includes("place") && feature.text) ||
    (feature.place_type.includes("locality") && feature.text) ||
    placeContext?.text ||
    localityContext?.text ||
    districtContext?.text ||
    feature.text;
  const country =
    (feature.place_type.includes("country") && feature.text) ||
    countryContext?.text ||
    "Unknown";
  const region = regionContext?.text || districtContext?.text || undefined;

  const center = Array.isArray(feature.center)
    ? feature.center
    : Array.isArray(feature.geometry?.coordinates)
      ? feature.geometry.coordinates
      : null;
  const longitude = Number(center?.[0]);
  const latitude = Number(center?.[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  const label =
    city && country
      ? `${city}, ${country}`
      : feature.place_name || `${feature.text}, ${country}`;

  return {
    id: feature.id,
    label,
    fullName: feature.place_name || label,
    city,
    region,
    country,
    countryCode: normalizeCountryCode(countryContext?.short_code ?? feature.short_code),
    latitude,
    longitude,
    provider: "mapbox",
  };
}

function getMapboxToken() {
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("mapbox_access_token_missing");
  }
  return token;
}

function getGeocodingClient() {
  if (!geocodingClient) {
    geocodingClient = mbxGeocoding(
      mapboxSdk({
        accessToken: getMapboxToken(),
      })
    );
  }
  return geocodingClient;
}

function getCacheKey(query: string, limit: number, language: string) {
  return `${query.toLowerCase()}::${limit}::${language.toLowerCase()}`;
}

function readFromCache(key: string): LocationSuggestion[] | null {
  const entry = suggestionCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    suggestionCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeToCache(key: string, value: LocationSuggestion[]) {
  suggestionCache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  if (suggestionCache.size <= CACHE_MAX_KEYS) return;
  const oldestKey = suggestionCache.keys().next().value;
  if (oldestKey) {
    suggestionCache.delete(oldestKey);
  }
}

export function hasMapboxAccessToken() {
  return Boolean(process.env.MAPBOX_ACCESS_TOKEN?.trim());
}

export async function searchGlobalLocations(
  input: SearchGlobalLocationsInput
): Promise<LocationSuggestion[]> {
  const startedAt = Date.now();
  const query = input.query.trim();
  if (query.length < 2) return [];

  const limit = Math.min(MAX_LIMIT, Math.max(1, input.limit ?? DEFAULT_LIMIT));
  const language = input.language?.trim() || "en";
  const cacheKey = getCacheKey(query, limit, language);
  const cached = readFromCache(cacheKey);
  if (cached) {
    logger.info("search.cache_hit", {
      durationMs: durationMs(startedAt),
      outcome: "hit",
      query,
      limit,
      language,
      count: cached.length,
    });
    return cached;
  }
  logger.info("search.start", {
    query,
    limit,
    language,
  });

  const response = await getGeocodingClient()
    .forwardGeocode({
      query,
      mode: "mapbox.places",
      autocomplete: true,
      limit,
      language: [language],
      types: FORWARD_TYPES,
    })
    .send();

  const dedupe = new Map<string, LocationSuggestion>();
  const features = Array.isArray(response.body.features)
    ? response.body.features
    : [];

  for (const feature of features) {
    const suggestion = toLocationSuggestion(feature);
    if (!suggestion) continue;
    const key = `${suggestion.label.toLowerCase()}::${suggestion.countryCode ?? ""}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, suggestion);
    }
  }

  const suggestions = Array.from(dedupe.values());
  writeToCache(cacheKey, suggestions);
  logger.info("search.success", {
    durationMs: durationMs(startedAt),
    outcome: "success",
    query,
    limit,
    language,
    count: suggestions.length,
  });
  return suggestions;
}
