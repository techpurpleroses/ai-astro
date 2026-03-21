import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { AppError } from "@/server/foundation/errors";
import { getAstroAiRuntime } from "@/server/products/astroai/runtime";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceRoleSupabaseClient } from "@/server/integrations/supabase";
import { PLANET_GLYPHS } from "@/lib/constants";
import type { BirthChartData, PlanetPosition, HousePosition, Aspect, AspectType, StellarComposition } from "@/types";
import type { BirthChartDTO } from "@/server/products/astroai/modules/birth-chart/types";

export const runtime = "nodejs";
const logger = createServerLogger("api.dashboard.birth-chart");

// ── Sign abbreviation → full name ─────────────────────────────────────────────
const SIGN_FULL: Record<string, string> = {
  ari: "Aries",  tau: "Taurus",      gem: "Gemini",    can: "Cancer",
  leo: "Leo",    vir: "Virgo",       lib: "Libra",     sco: "Scorpio",
  sag: "Sagittarius", cap: "Capricorn", aqu: "Aquarius", pis: "Pisces",
};

function expandSign(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "Unknown";
  const norm = raw.toLowerCase().replace(/[^a-z]/g, "");
  return SIGN_FULL[norm.slice(0, 3)] ?? raw;
}

const VALID_ASPECT_TYPES = new Set<string>([
  "conjunction", "opposition", "trine", "square", "sextile", "quincunx",
]);

const PLANET_ROLES: Record<string, string> = {
  Sun:     "core identity and life purpose",
  Moon:    "emotional nature and instincts",
  Mercury: "thinking and communication style",
  Venus:   "approach to love and values",
  Mars:    "drive, desire, and action",
  Jupiter: "growth, opportunity, and philosophy",
  Saturn:  "discipline, structure, and responsibility",
  Uranus:  "innovation and personal freedom",
  Neptune: "intuition, dreams, and spirituality",
  Pluto:   "transformation and depth of power",
};

function makePlanetDescription(name: string, sign: string, house: number, isRetrograde: boolean): string {
  const role = PLANET_ROLES[name] ?? "cosmic influence";
  const retro = isRetrograde ? " This planet is retrograde — its energy turns inward and reflective." : "";
  return `${name} in ${sign}, House ${house}. ${sign} energy shapes your ${role}.${retro}`;
}

function mapBodies(bodies: Array<Record<string, unknown>>): PlanetPosition[] {
  return bodies
    .filter((b) => typeof b.name === "string")
    .map((b) => {
      const name = String(b.name);
      const sign = expandSign(b.sign);
      const house = typeof b.house === "number" ? b.house : 0;
      const degree = typeof b.degree === "number" ? Math.round(b.degree * 100) / 100 : 0;
      const absoluteDegree =
        typeof b.absolute_longitude === "number"
          ? Math.round(b.absolute_longitude * 10000) / 10000
          : degree;
      const isRetrograde = b.is_retrograde === true || b.retrograde === true;
      const glyph = PLANET_GLYPHS[name] ?? name.slice(0, 3);
      return {
        name,
        glyph,
        sign,
        house,
        degree,
        absoluteDegree,
        isRetrograde,
        description: makePlanetDescription(name, sign, house, isRetrograde),
      };
    });
}

function mapHouses(houses: Array<Record<string, unknown>>): HousePosition[] {
  return houses
    .filter((h) => typeof h.house === "number" || typeof h.number === "number")
    .map((h) => ({
      number: typeof h.house === "number" ? h.house : Number(h.number),
      sign: expandSign(h.sign),
      degree: typeof h.degree === "number" ? Math.round(h.degree * 100) / 100 : 0,
      absoluteDegree:
        typeof h.absolute_longitude === "number"
          ? Math.round(h.absolute_longitude * 10000) / 10000
          : 0,
    }));
}

function mapAspects(aspects: Array<Record<string, unknown>>): Aspect[] {
  return aspects
    .filter((a) => typeof a.point1 === "string" && typeof a.point2 === "string")
    .map((a) => {
      const rawType =
        typeof a.aspect_type === "string" ? a.aspect_type.toLowerCase() : "";
      return {
        planet1: String(a.point1),
        planet2: String(a.point2),
        type: (VALID_ASPECT_TYPES.has(rawType) ? rawType : "conjunction") as AspectType,
        orb: typeof a.orb === "number" ? Math.abs(Math.round(a.orb * 100) / 100) : 0,
        degree1: typeof a.degree1 === "number" ? a.degree1 : 0,
        degree2: typeof a.degree2 === "number" ? a.degree2 : 0,
      };
    });
}

// ── Element / modality for StellarComposition ─────────────────────────────────
const SIGN_ELEMENT: Record<string, keyof StellarComposition> = {
  Aries: "fire",    Leo: "fire",    Sagittarius: "fire",
  Taurus: "earth",  Virgo: "earth", Capricorn: "earth",
  Gemini: "air",    Libra: "air",   Aquarius: "air",
  Cancer: "water",  Scorpio: "water", Pisces: "water",
};
const SIGN_MODALITY: Record<string, keyof StellarComposition> = {
  Aries: "cardinal",  Cancer: "cardinal",    Libra: "cardinal",     Capricorn: "cardinal",
  Taurus: "fixed",    Leo: "fixed",          Scorpio: "fixed",      Aquarius: "fixed",
  Gemini: "mutable",  Virgo: "mutable",      Sagittarius: "mutable", Pisces: "mutable",
};

function computeStellarComposition(planets: PlanetPosition[]): StellarComposition {
  const counts: StellarComposition = { fire: 0, earth: 0, air: 0, water: 0, cardinal: 0, fixed: 0, mutable: 0 };
  for (const p of planets) {
    const elem = SIGN_ELEMENT[p.sign];
    const mod = SIGN_MODALITY[p.sign];
    if (elem) counts[elem]++;
    if (mod) counts[mod]++;
  }
  return counts;
}

function mapDtoToFrontend(dto: BirthChartDTO): BirthChartData {
  const planets = mapBodies(dto.bodies);
  const houses = mapHouses(dto.houses);
  const aspects = mapAspects(dto.aspects);

  const sunPlanet  = planets.find((p) => p.name === "Sun");
  const moonPlanet = planets.find((p) => p.name === "Moon");
  const house1     = houses.find((h) => h.number === 1);

  return {
    bigThree: {
      sun: {
        sign:   sunPlanet?.sign  ?? dto.sunSign  ?? "Unknown",
        degree: sunPlanet?.degree ?? 0,
        glyph:  PLANET_GLYPHS["Sun"] ?? "☉",
      },
      moon: {
        sign:   moonPlanet?.sign  ?? dto.moonSign ?? "Unknown",
        degree: moonPlanet?.degree ?? 0,
        glyph:  PLANET_GLYPHS["Moon"] ?? "☽",
      },
      ascendant: {
        sign:   house1?.sign  ?? dto.risingSign ?? "Unknown",
        degree: house1?.degree ?? 0,
        glyph:  PLANET_GLYPHS["Ascendant"] ?? "Asc",
      },
    },
    stellarComposition: computeStellarComposition(planets),
    planets,
    houses,
    aspects,
    // Daily transits require a separate endpoint — deferred to Phase 2
    dailyTransits: { shortTerm: [], longTerm: [] },
  };
}

// ── Subject lookup ─────────────────────────────────────────────────────────────
async function getSubjectId(
  userId: string
): Promise<{ subjectId: string | null; isPlaceholder: boolean }> {
  try {
    const serviceSupabase = getServiceRoleSupabaseClient();
    const { data } = await serviceSupabase
      .schema("identity")
      .from("subjects")
      .select("id, is_placeholder")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (!data) return { subjectId: null, isPlaceholder: true };
    const row = data as { id: string | null; is_placeholder: boolean | null };
    return { subjectId: row.id, isPlaceholder: row.is_placeholder ?? true };
  } catch {
    return { subjectId: null, isPlaceholder: true };
  }
}

// ── GET /api/dashboard/birth-chart ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  return observeApiRoute({
    scope: "api.dashboard.birth-chart.GET",
    request: req,
    handler: async () => {
      try {
        const supabase = await getServerSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          logger.warn("request.unauthorized");
          return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const { subjectId, isPlaceholder } = await getSubjectId(user.id);
        if (!subjectId || isPlaceholder) {
          logger.info("request.no_subject", { userId: user.id, isPlaceholder });
          return NextResponse.json({ data: null, isPlaceholder: true }, { status: 200 });
        }

        const { birthChartService } = getAstroAiRuntime();
        const response = await birthChartService.getBirthChart({
          userId: user.id,
          subjectId,
          chartType: "natal",
          systemType: "western",
          traceId: randomUUID(),
        });

        const frontendData = mapDtoToFrontend(response.data);
        logger.info("request.success", {
          userId: user.id,
          subjectId,
          cacheHit: response.meta.cacheHit,
          freshnessStatus: response.meta.freshnessStatus,
          planets: frontendData.planets.length,
          houses: frontendData.houses.length,
        });

        return NextResponse.json(
          {
            data: frontendData,
            meta: {
              freshnessStatus: response.meta.freshnessStatus,
              cacheHit: response.meta.cacheHit,
            },
          },
          { status: 200 }
        );
      } catch (error) {
        if (error instanceof AppError) {
          logger.warn("request.app_error", { code: error.code, status: error.status });
          return NextResponse.json(
            { error: error.code, message: error.message },
            { status: error.status }
          );
        }
        logger.error("request.error", { error });
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    },
  });
}
