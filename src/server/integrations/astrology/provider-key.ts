export const ASTROLOGY_PROVIDER_KEYS = [
  "prokerala",
  "astrologyapi",
  "astrology_api_io",
] as const;

export type AstrologyProviderKey = (typeof ASTROLOGY_PROVIDER_KEYS)[number];

