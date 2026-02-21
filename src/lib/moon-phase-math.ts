/**
 * Generates an SVG path for the illuminated portion of the moon.
 * @param illumination - 0 to 100 (percentage)
 * @param isWaxing - true if waxing, false if waning
 * @param r - circle radius (default 44)
 */
export function moonPhaseClipPath(
  illumination: number,
  isWaxing: boolean,
  r = 44,
): string {
  const fraction = illumination / 100

  if (fraction <= 0.01) {
    // New moon — tiny sliver
    return `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${r * 0.01} ${r} 0 0 0 0 ${-r} Z`
  }

  if (fraction >= 0.99) {
    // Full moon — full circle
    return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`
  }

  // k is the x-radius of the inner ellipse
  // k = 0 → half moon, k > 0 → more lit, k < 0 → less lit
  // For waxing: illumination 0→50 goes half→gibbous on right side
  // For waning: illuminated on left side
  let rx: number
  let innerSweep: number

  if (fraction <= 0.5) {
    rx = r * (1 - 2 * fraction)
    innerSweep = isWaxing ? 0 : 1
  } else {
    rx = r * (2 * fraction - 1)
    innerSweep = isWaxing ? 1 : 0
  }

  const outerSweep = isWaxing ? 1 : 0

  // Always draw the outer half circle first, then the inner ellipse arc
  return [
    `M 0 ${-r}`,
    `A ${r} ${r} 0 0 ${outerSweep} 0 ${r}`,
    `A ${rx} ${r} 0 0 ${innerSweep} 0 ${-r}`,
    'Z',
  ].join(' ')
}

/**
 * Returns the approximate visual angle (in degrees from 12 o'clock) for a given moon phase name.
 * Used for the phase indicator ring.
 */
export function phaseToAngle(phaseName: string): number {
  const phases: Record<string, number> = {
    'New Moon':       0,
    'Waxing Crescent': 45,
    'First Quarter':  90,
    'Waxing Gibbous': 135,
    'Full Moon':      180,
    'Waning Gibbous': 225,
    'Last Quarter':   270,
    'Waning Crescent': 315,
  }
  return phases[phaseName] ?? 0
}
