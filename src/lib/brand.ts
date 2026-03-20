/**
 * Central brand config.
 * Change BRAND_NAME here and it propagates everywhere.
 */

export const BRAND_NAME = "AstroAI";
export const BRAND_TAGLINE = "Your Cosmic Guide";
export const BRAND_FULL = `${BRAND_NAME} – ${BRAND_TAGLINE}`;

/** e.g. "AstroAI/1.0" — used in HTTP User-Agent headers */
export const BRAND_USER_AGENT = `${BRAND_NAME}/1.0`;

/** Copyright line — year is kept dynamic */
export function brandCopyright(): string {
  return `© ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.`;
}
