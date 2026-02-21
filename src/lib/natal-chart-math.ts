// ─── Natal Chart SVG Geometry ────────────────────────────────────────────────
// Pure math functions for rendering the birth chart SVG wheel.
// viewBox: "0 0 400 400"  →  center (CX, CY) = (200, 200)

export const CX = 200
export const CY = 200

// Ring radii (outer → inner)
export const R_OUTER = 184          // outer zodiac arc boundary
export const R_SIGN_OUTER = 184     // outer edge of sign band
export const R_SIGN_INNER = 155     // inner edge of sign band
export const R_PLANET = 130         // planet glyph ring
export const R_HOUSE = 96           // house line endpoint (inner)
export const R_ASPECT = 78          // aspect line endpoint (center region)

// ── Core conversion ─────────────────────────────────────────────────────────

/**
 * Convert an ecliptic degree (0–360, Aries = 0) to SVG x,y at radius r.
 * Aries 0° is at the 9 o'clock position (left), ascending counterclockwise.
 * We rotate so that 0° Aries maps to the left (standard astrological convention).
 */
export function degToXY(
  degree: number,
  radius: number,
): { x: number; y: number } {
  // Astrological wheels: 0° Aries at left, anticlockwise
  // SVG angles: 0° = right, clockwise
  // Conversion: svgAngle = 180 - degree (flip + offset)
  const rad = ((180 - degree) * Math.PI) / 180
  return {
    x: CX + radius * Math.cos(rad),
    y: CY - radius * Math.sin(rad),
  }
}

// ── Sign arc paths ───────────────────────────────────────────────────────────

/**
 * Build an SVG <path d="..."> for one of the 12 zodiac sign arcs.
 * Each sign occupies 30°. startDeg is the start of the sign's ecliptic range.
 */
export function signArcPath(startDeg: number): string {
  const endDeg = startDeg + 30
  const p1 = degToXY(startDeg, R_SIGN_OUTER)
  const p2 = degToXY(endDeg, R_SIGN_OUTER)
  const p3 = degToXY(endDeg, R_SIGN_INNER)
  const p4 = degToXY(startDeg, R_SIGN_INNER)

  // large-arc-flag: 0 (arc < 180°), sweep: 0 (anticlockwise in SVG coords)
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${R_SIGN_OUTER} ${R_SIGN_OUTER} 0 0 0 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${R_SIGN_INNER} ${R_SIGN_INNER} 0 0 1 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

/** Mid-point of a sign arc (for placing the glyph label) */
export function signMidXY(startDeg: number, radius: number) {
  return degToXY(startDeg + 15, radius)
}

// ── House lines ──────────────────────────────────────────────────────────────

/**
 * Generate the SVG line element props for a house cusp line.
 * Line runs from the sign band inner edge to the center aspect circle.
 */
export function houseLine(absoluteDegree: number): {
  x1: number; y1: number; x2: number; y2: number
} {
  const outer = degToXY(absoluteDegree, R_SIGN_INNER)
  const inner = degToXY(absoluteDegree, R_ASPECT)
  return { x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y }
}

// ── Aspect lines ─────────────────────────────────────────────────────────────

export function aspectLine(deg1: number, deg2: number): {
  x1: number; y1: number; x2: number; y2: number
} {
  const p1 = degToXY(deg1, R_ASPECT)
  const p2 = degToXY(deg2, R_ASPECT)
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
}

// ── Planet collision spreading ────────────────────────────────────────────────

interface PlacedPlanet {
  name: string
  absoluteDegree: number
  displayDegree: number  // potentially spread to avoid overlap
}

/**
 * When two planets are within MIN_GAP degrees of each other on the wheel,
 * spread them outward from their midpoint to avoid label collision.
 */
export function spreadPlanetPositions(
  planets: Array<{ name: string; absoluteDegree: number }>,
  minGap = 9,
): PlacedPlanet[] {
  // Sort by absoluteDegree
  const sorted = [...planets].sort((a, b) => a.absoluteDegree - b.absoluteDegree)

  // Clone with displayDegree = absoluteDegree initially
  const placed: PlacedPlanet[] = sorted.map((p) => ({
    ...p,
    displayDegree: p.absoluteDegree,
  }))

  // Multiple passes to resolve overlaps
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < placed.length; i++) {
      const next = (i + 1) % placed.length
      let diff = placed[next].displayDegree - placed[i].displayDegree
      // Handle wrap-around (360° boundary)
      if (diff < 0) diff += 360
      if (diff < minGap && diff > 0) {
        const shift = (minGap - diff) / 2
        placed[i].displayDegree -= shift
        placed[next].displayDegree += shift
      }
    }
  }

  return placed
}
