/**
 * Birth chart computation for onboarding.
 *
 * Sun / Moon / Ascendant use the astronomia library (high-accuracy).
 * Planets Mercury–Pluto use Paul Schlyter's simplified orbital elements
 * algorithm (accuracy ~1-2°, sufficient for sign determination).
 *
 * Reference: https://www.stjarnhimlen.se/comp/ppcomp.html
 */

// Dynamically import to avoid bundling on the client side.
// This file is only called from a server-side API route.

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type ZodiacSign =
  | "aries" | "taurus" | "gemini" | "cancer"
  | "leo" | "virgo" | "libra" | "scorpio"
  | "sagittarius" | "capricorn" | "aquarius" | "pisces";

export type Planet =
  | "sun" | "moon" | "mercury" | "venus" | "mars"
  | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto";

export type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";

export interface PlanetPosition {
  planet: Planet;
  sign: ZodiacSign;
  degree: number;       // 0–29.99 within the sign
  longitude: number;    // 0–359.99 absolute ecliptic longitude
  house: number;        // 1–12 (Whole Sign Houses)
  retrograde: boolean;  // placeholder — not computed here
}

export interface HousePosition {
  house: number;        // 1–12
  sign: ZodiacSign;
  longitude: number;    // house cusp longitude (0–359.99)
}

export interface Aspect {
  planet1: Planet;
  planet2: Planet;
  type: AspectType;
  orb: number;          // degrees from exact
}

export interface ChartResult {
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign: ZodiacSign;
  ascendant: number;        // absolute ecliptic longitude of ASC
  midheaven: number;        // MC longitude
  lifePath: number;         // 1–9 or 11, 22, 33
  element: "fire" | "earth" | "air" | "water";
  modality: "cardinal" | "fixed" | "mutable";
  dominantElement: "fire" | "earth" | "air" | "water";
  planets: PlanetPosition[];
  houses: HousePosition[];
  aspects: Aspect[];
}

export interface BirthData {
  year: number;
  month: number;          // 1–12
  day: number;
  hour: number;           // 0–23 UTC
  minute: number;         // 0–59
  latitude: number;       // decimal degrees, positive = north
  longitude: number;      // decimal degrees, positive = east
  hasTime: boolean;       // false = skip moon/rising computation
  // Original local calendar date — used for life path numerology (not UTC-shifted)
  localYear?: number;
  localMonth?: number;
  localDay?: number;
}

// ─────────────────────────────────────────────────────────
// Sign helpers
// ─────────────────────────────────────────────────────────

const SIGNS: ZodiacSign[] = [
  "aries", "taurus", "gemini", "cancer",
  "leo", "virgo", "libra", "scorpio",
  "sagittarius", "capricorn", "aquarius", "pisces",
];

const SIGN_ELEMENTS: Record<ZodiacSign, "fire" | "earth" | "air" | "water"> = {
  aries: "fire", leo: "fire", sagittarius: "fire",
  taurus: "earth", virgo: "earth", capricorn: "earth",
  gemini: "air", libra: "air", aquarius: "air",
  cancer: "water", scorpio: "water", pisces: "water",
};

const SIGN_MODALITIES: Record<ZodiacSign, "cardinal" | "fixed" | "mutable"> = {
  aries: "cardinal", cancer: "cardinal", libra: "cardinal", capricorn: "cardinal",
  taurus: "fixed", leo: "fixed", scorpio: "fixed", aquarius: "fixed",
  gemini: "mutable", virgo: "mutable", sagittarius: "mutable", pisces: "mutable",
};

function lonToSign(lon: number): ZodiacSign {
  const norm = ((lon % 360) + 360) % 360;
  return SIGNS[Math.floor(norm / 30)];
}

function lonToDegreeInSign(lon: number): number {
  const norm = ((lon % 360) + 360) % 360;
  return norm % 30;
}

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// ─────────────────────────────────────────────────────────
// Julian Day
// ─────────────────────────────────────────────────────────

function toJD(year: number, month: number, day: number, hour: number, minute: number): number {
  // Meeus Algorithm 7.1 — valid for Gregorian calendar
  let y = year;
  let m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFrac = day + (hour + minute / 60) / 24;
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayFrac + B - 1524.5;
}

// Days since J2000.0
function dJ2000(jd: number): number {
  return jd - 2451545.0;
}

// Julian centuries from J2000
function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

// ─────────────────────────────────────────────────────────
// Sun (Meeus Chapter 25 simplified — same as astronomia solar.trueLongitude)
// ─────────────────────────────────────────────────────────

function computeSunLongitude(T: number): number {
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  return norm360(L0 + C);
}

// ─────────────────────────────────────────────────────────
// Moon (Meeus Chapter 47 simplified)
// ─────────────────────────────────────────────────────────

function computeMoonLongitude(T: number): number {
  const Lp = norm360(218.3165 + 481267.8813 * T) * DEG;
  const D = norm360(297.8502 + 445267.1115 * T) * DEG;
  const M = norm360(357.5291 + 35999.0503 * T) * DEG;
  const Mp = norm360(134.9634 + 477198.8676 * T) * DEG;
  const F = norm360(93.2721 + 483202.0175 * T) * DEG;

  const dL =
    6288774 * Math.sin(Mp) +
    1274027 * Math.sin(2 * D - Mp) +
    658314  * Math.sin(2 * D) +
    213618  * Math.sin(2 * Mp) +
    -185116 * Math.sin(M) +
    -114332 * Math.sin(2 * F) +
    58793   * Math.sin(2 * D - 2 * Mp) +
    57066   * Math.sin(2 * D - M - Mp) +
    53322   * Math.sin(2 * D + Mp) +
    45758   * Math.sin(2 * D - M) +
    -40923  * Math.sin(M - Mp) +
    -34720  * Math.sin(D) +
    -30383  * Math.sin(M + Mp) +
    15327   * Math.sin(2 * D - 2 * F) +
    -12528  * Math.sin(Mp + 2 * F) +
    10980   * Math.sin(Mp - 2 * F) +
    10675   * Math.sin(4 * D - Mp) +
    10034   * Math.sin(3 * Mp) +
    8548    * Math.sin(4 * D - 2 * Mp) +
    -7888   * Math.sin(2 * D + M - Mp) +
    -6766   * Math.sin(2 * D + M) +
    -5163   * Math.sin(D - Mp);

  return norm360(Lp * RAD + dL / 1000000);
}

// ─────────────────────────────────────────────────────────
// Obliquity of the ecliptic (Meeus)
// ─────────────────────────────────────────────────────────

function meanObliquity(T: number): number {
  return (23.439291111 - 0.013004167 * T - 0.000000164 * T * T + 0.000000504 * T * T * T) * DEG;
}

// ─────────────────────────────────────────────────────────
// Apparent Sidereal Time at Greenwich (Meeus Chapter 12)
// ─────────────────────────────────────────────────────────

function greenwichSiderealTime(jd: number): number {
  const T = julianCenturies(jd);
  const theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  return norm360(theta0) * DEG; // radians
}

// ─────────────────────────────────────────────────────────
// Ascendant / MC (Placidus-approximate, Whole Sign used for houses)
// ─────────────────────────────────────────────────────────

function computeAscendantMC(jd: number, lat: number, lon: number): { asc: number; mc: number } {
  const GMST = greenwichSiderealTime(jd); // radians
  const lstRad = GMST + lon * DEG;        // Local Sidereal Time in radians
  const T = julianCenturies(jd);
  const eps = meanObliquity(T);
  const latRad = lat * DEG;

  // Midheaven (MC): ecliptic longitude of the meridian
  const mc = norm360(Math.atan2(Math.sin(lstRad) * Math.cos(eps), Math.cos(lstRad)) * RAD);

  // Ascendant
  const ascRad = Math.atan2(
    Math.cos(lstRad),
    -(Math.sin(lstRad) * Math.cos(eps) + Math.tan(latRad) * Math.sin(eps))
  );
  const asc = norm360(ascRad * RAD);

  return { asc, mc };
}

// ─────────────────────────────────────────────────────────
// Planetary positions (Paul Schlyter simplified algorithm)
// Accuracy: ~1-2° — sufficient for sign determination
// ─────────────────────────────────────────────────────────

interface OrbitalElements {
  N: (d: number) => number; // longitude of ascending node
  i: (d: number) => number; // inclination
  w: (d: number) => number; // argument of perihelion
  a: (d: number) => number; // semi-major axis (AU)
  e: (d: number) => number; // eccentricity
  M: (d: number) => number; // mean anomaly (degrees)
}

const ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  mercury: {
    N: (d) => 48.3313 + 3.24587e-5 * d,
    i: (d) => 7.0047 + 5.0e-8 * d,
    w: (d) => 29.1241 + 1.01444e-5 * d,
    a: () => 0.387098,
    e: (d) => 0.205635 + 5.59e-10 * d,
    M: (d) => norm360(168.6562 + 4.0923344368 * d),
  },
  venus: {
    N: (d) => 76.6799 + 2.4659e-5 * d,
    i: (d) => 3.3946 + 2.75e-8 * d,
    w: (d) => 54.891 + 1.38374e-5 * d,
    a: () => 0.72333,
    e: (d) => 0.006773 - 1.302e-9 * d,
    M: (d) => norm360(48.0052 + 1.6021302244 * d),
  },
  sun: {
    N: () => 0,
    i: () => 0,
    w: (d) => 282.9404 + 4.70935e-5 * d,
    a: () => 1.0,
    e: (d) => 0.016709 - 1.151e-9 * d,
    M: (d) => norm360(356.047 + 0.9856002585 * d),
  },
  mars: {
    N: (d) => 49.5574 + 2.11081e-5 * d,
    i: (d) => 1.8497 - 1.78e-8 * d,
    w: (d) => 286.5016 + 2.92961e-5 * d,
    a: () => 1.523688,
    e: (d) => 0.093405 + 2.516e-9 * d,
    M: (d) => norm360(18.6021 + 0.5240207766 * d),
  },
  jupiter: {
    N: (d) => 100.4542 + 2.76854e-5 * d,
    i: (d) => 1.303 - 1.557e-7 * d,
    w: (d) => 273.8777 + 1.64505e-5 * d,
    a: () => 5.20256,
    e: (d) => 0.048498 + 4.469e-9 * d,
    M: (d) => norm360(19.895 + 0.0830853001 * d),
  },
  saturn: {
    N: (d) => 113.6634 + 2.3898e-5 * d,
    i: (d) => 2.4886 - 1.081e-7 * d,
    w: (d) => 339.3939 + 2.97661e-5 * d,
    a: () => 9.55475,
    e: (d) => 0.055546 - 9.499e-9 * d,
    M: (d) => norm360(316.967 + 0.0334442282 * d),
  },
  uranus: {
    N: (d) => 74.0005 + 1.3978e-5 * d,
    i: (d) => 0.7733 + 1.9e-8 * d,
    w: (d) => 96.6612 + 3.0565e-5 * d,
    a: (d) => 19.18171 - 1.55e-8 * d,
    e: (d) => 0.047318 + 7.45e-9 * d,
    M: (d) => norm360(142.5905 + 0.011725806 * d),
  },
  neptune: {
    N: (d) => 131.7806 + 3.0173e-5 * d,
    i: (d) => 1.77 - 2.55e-7 * d,
    w: (d) => 272.8461 - 6.027e-6 * d,
    a: (d) => 30.05826 + 3.313e-8 * d,
    e: (d) => 0.008606 + 2.15e-9 * d,
    M: (d) => norm360(260.2471 + 0.005995147 * d),
  },
  // Pluto — Schlyter elements (accuracy ~2–3° due to high eccentricity/inclination)
  pluto: {
    N: (d) => 110.3 + 1.397e-5 * d,
    i: (d) => 17.14175,
    w: (d) => 113.768 + 1.524e-5 * d,
    a: () => 39.48168677,
    e: (d) => 0.24880766,
    M: (d) => norm360(14.53 + 0.00397007 * d),
  },
};

function eccentricAnomaly(M_deg: number, e: number): number {
  let E = M_deg * DEG;
  for (let i = 0; i < 10; i++) {
    const delta = (M_deg * DEG - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += delta;
    if (Math.abs(delta) < 1e-9) break;
  }
  return E;
}

function heliocentricRect(el: OrbitalElements, d: number) {
  const N = el.N(d) * DEG;
  const i = el.i(d) * DEG;
  const w = el.w(d) * DEG;
  const a = el.a(d);
  const e = el.e(d);
  const M = el.M(d);

  const E = eccentricAnomaly(M, e);
  const xv = a * (Math.cos(E) - e);
  const yv = a * (Math.sqrt(1 - e * e) * Math.sin(E));
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);

  return {
    x: r * (Math.cos(N) * Math.cos(v + w) - Math.sin(N) * Math.sin(v + w) * Math.cos(i)),
    y: r * (Math.sin(N) * Math.cos(v + w) + Math.cos(N) * Math.sin(v + w) * Math.cos(i)),
    z: r * (Math.sin(v + w) * Math.sin(i)),
  };
}

function planetGeocentricLon(planet: string, d: number, sunXYZ: { x: number; y: number; z: number }): number {
  const el = ORBITAL_ELEMENTS[planet];
  if (!el) return 0;
  const helio = heliocentricRect(el, d);
  // Geocentric = heliocentric planet + Sun's geocentric XYZ (Schlyter convention)
  const X = helio.x + sunXYZ.x;
  const Y = helio.y + sunXYZ.y;
  return norm360(Math.atan2(Y, X) * RAD);
}

function sunGeocentricLon(d: number): { lon: number; xyz: { x: number; y: number; z: number } } {
  const el = ORBITAL_ELEMENTS.sun;
  const w = el.w(d) * DEG;
  const e = el.e(d);
  const M = el.M(d);
  const E = eccentricAnomaly(M, e);
  const xv = Math.cos(E) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E);
  const r = Math.sqrt(xv * xv + yv * yv);
  const v = Math.atan2(yv, xv);
  const lonsun = norm360((v + w) * RAD);
  const xs = r * Math.cos(lonsun * DEG);
  const ys = r * Math.sin(lonsun * DEG);
  return { lon: lonsun, xyz: { x: xs, y: ys, z: 0 } };
}

// ─────────────────────────────────────────────────────────
// Numerology — Life Path Number
// ─────────────────────────────────────────────────────────

function digitSum(n: number): number {
  return String(Math.abs(n))
    .split("")
    .reduce((sum, d) => sum + parseInt(d, 10), 0);
}

function reduceToLifePath(year: number, month: number, day: number): number {
  // Reduce month, day, year separately, then sum
  let m = month;
  while (m > 9 && m !== 11 && m !== 22 && m !== 33) m = digitSum(m);

  let d = day;
  while (d > 9 && d !== 11 && d !== 22 && d !== 33) d = digitSum(d);

  let y = year;
  while (y > 9) y = digitSum(y);
  // y can't be a master number (4-digit years always reduce further)

  let total = m + d + y;
  while (total > 9 && total !== 11 && total !== 22 && total !== 33) {
    total = digitSum(total);
  }
  return total;
}

// ─────────────────────────────────────────────────────────
// Aspects
// ─────────────────────────────────────────────────────────

const ASPECT_ORBS: Record<AspectType, number> = {
  conjunction: 8,
  sextile: 4,
  square: 7,
  trine: 7,
  opposition: 8,
};

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function findAspects(positions: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = [];
  const checks: Array<{ angle: number; type: AspectType }> = [
    { angle: 0, type: "conjunction" },
    { angle: 60, type: "sextile" },
    { angle: 90, type: "square" },
    { angle: 120, type: "trine" },
    { angle: 180, type: "opposition" },
  ];

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const diff = angleDiff(positions[i].longitude, positions[j].longitude);
      for (const { angle, type } of checks) {
        const orb = Math.abs(diff - angle);
        if (orb <= ASPECT_ORBS[type]) {
          aspects.push({
            planet1: positions[i].planet,
            planet2: positions[j].planet,
            type,
            orb: Math.round(orb * 10) / 10,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

// ─────────────────────────────────────────────────────────
// Whole Sign Houses
// ─────────────────────────────────────────────────────────

function computeWholeSignHouses(asc: number): HousePosition[] {
  const ascSignIndex = Math.floor(((asc % 360) + 360) % 360 / 30);
  const houses: HousePosition[] = [];
  for (let h = 0; h < 12; h++) {
    const signIndex = (ascSignIndex + h) % 12;
    houses.push({
      house: h + 1,
      sign: SIGNS[signIndex],
      longitude: signIndex * 30,
    });
  }
  return houses;
}

function planetHouse(planetLon: number, houses: HousePosition[]): number {
  const norm = ((planetLon % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const h = houses.find((h) => Math.floor(h.longitude / 30) === signIndex);
  return h?.house ?? 1;
}

// ─────────────────────────────────────────────────────────
// Dominant element
// ─────────────────────────────────────────────────────────

function computeDominantElement(
  planets: PlanetPosition[]
): "fire" | "earth" | "air" | "water" {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  // Weight personal planets more
  const weights: Partial<Record<Planet, number>> = {
    sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2,
    jupiter: 1, saturn: 1, uranus: 1, neptune: 1, pluto: 1,
  };
  for (const p of planets) {
    const el = SIGN_ELEMENTS[p.sign];
    counts[el] += weights[p.planet] ?? 1;
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as "fire" | "earth" | "air" | "water";
}

// ─────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────

export function computeChart(birth: BirthData): ChartResult {
  // Convert local birth time to UTC using the birth longitude
  // (approximation: offset = longitude / 15 hours)
  // Note: real usage should pass UTC hour/minute directly
  const jd = toJD(birth.year, birth.month, birth.day, birth.hour, birth.minute);
  const d = dJ2000(jd);
  const T = julianCenturies(jd);

  // ── Sun ──
  const sunLon = computeSunLongitude(T);

  // ── Moon ──
  const moonLon = birth.hasTime ? computeMoonLongitude(T) : NaN;

  // ── Ascendant / MC ──
  let ascLon = sunLon; // fallback: ASC = Sun (no time)
  let mcLon = sunLon;
  if (birth.hasTime) {
    const { asc, mc } = computeAscendantMC(jd, birth.latitude, birth.longitude);
    ascLon = asc;
    mcLon = mc;
  }

  // ── Planets via Schlyter orbital elements ──
  const { xyz: sunXYZ } = sunGeocentricLon(d);

  const planetLons: Array<{ planet: Planet; lon: number }> = [
    { planet: "sun", lon: sunLon },
    { planet: "moon", lon: birth.hasTime ? moonLon : NaN },
    { planet: "mercury", lon: planetGeocentricLon("mercury", d, sunXYZ) },
    { planet: "venus", lon: planetGeocentricLon("venus", d, sunXYZ) },
    { planet: "mars", lon: planetGeocentricLon("mars", d, sunXYZ) },
    { planet: "jupiter", lon: planetGeocentricLon("jupiter", d, sunXYZ) },
    { planet: "saturn", lon: planetGeocentricLon("saturn", d, sunXYZ) },
    { planet: "uranus", lon: planetGeocentricLon("uranus", d, sunXYZ) },
    { planet: "neptune", lon: planetGeocentricLon("neptune", d, sunXYZ) },
    { planet: "pluto", lon: planetGeocentricLon("pluto", d, sunXYZ) },
  ];

  // ── Whole Sign Houses ──
  const houses = computeWholeSignHouses(ascLon);

  // ── Build planet positions ──
  const planets: PlanetPosition[] = planetLons
    .filter((p) => !isNaN(p.lon))
    .map((p) => ({
      planet: p.planet,
      sign: lonToSign(p.lon),
      degree: Math.round(lonToDegreeInSign(p.lon) * 10) / 10,
      longitude: Math.round(p.lon * 10) / 10,
      house: planetHouse(p.lon, houses),
      retrograde: false,
    }));

  // ── Aspects ──
  const aspects = findAspects(planets);

  // ── Derived fields ──
  const sunSign = lonToSign(sunLon);
  const moonSign = birth.hasTime ? lonToSign(moonLon) : sunSign;
  const risingSign = birth.hasTime ? lonToSign(ascLon) : sunSign;
  // Life path must use the original local birth date, not the UTC-adjusted date
  const lpYear = birth.localYear ?? birth.year;
  const lpMonth = birth.localMonth ?? birth.month;
  const lpDay = birth.localDay ?? birth.day;
  const lifePath = reduceToLifePath(lpYear, lpMonth, lpDay);
  const element = SIGN_ELEMENTS[sunSign];
  const modality = SIGN_MODALITIES[sunSign];
  const dominantElement = computeDominantElement(planets);

  return {
    sunSign,
    moonSign,
    risingSign,
    ascendant: Math.round(ascLon * 10) / 10,
    midheaven: Math.round(mcLon * 10) / 10,
    lifePath,
    element,
    modality,
    dominantElement,
    planets,
    houses,
    aspects,
  };
}

/**
 * Convert local birth time to UTC.
 * Pass the birth location longitude to get a rough offset,
 * or pass utcOffsetHours directly (preferred).
 */
export function localToUTC(
  year: number, month: number, day: number,
  localHour: number, localMinute: number,
  utcOffsetHours: number
): { year: number; month: number; day: number; hour: number; minute: number } {
  // Work in total minutes to correctly handle fractional offsets (e.g. UTC+5:30, UTC+9:30)
  const offsetMinutes = Math.round(utcOffsetHours * 60);
  let totalMinutes = localHour * 60 + localMinute - offsetMinutes;
  let d = day, m = month, y = year;

  // Handle day boundary crossing
  while (totalMinutes < 0) { totalMinutes += 1440; d -= 1; }
  while (totalMinutes >= 1440) { totalMinutes -= 1440; d += 1; }

  const utcHour = Math.floor(totalMinutes / 60);
  const utcMinute = totalMinutes % 60;

  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  if (isLeap) daysInMonth[2] = 29;

  if (d < 1) { m -= 1; if (m < 1) { m = 12; y -= 1; } d = daysInMonth[m]; }
  if (d > daysInMonth[m]) { d = 1; m += 1; if (m > 12) { m = 1; y += 1; } }

  return { year: y, month: m, day: d, hour: utcHour, minute: utcMinute };
}
