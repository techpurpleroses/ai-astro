import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createServerLogger } from "@/server/foundation/observability/logger";
import { observeApiRoute } from "@/server/foundation/observability/route";
import { SaveOnboardingAnswerRequestSchema } from "@/lib/onboarding/contracts";
import { saveOnboardingAnswer, getOnboardingSession } from "@/lib/onboarding/store";
import { computeChart, localToUTC, type BirthData } from "@/lib/onboarding/chart-compute";

export const runtime = "nodejs";

const logger = createServerLogger("api.onboarding.session.answer");
const chartLogger = createServerLogger("onboarding.chart-compute");

const SessionParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function parseBirthDate(str: unknown): { year: number; month: number; day: number } | null {
  if (typeof str !== "string") return null;
  const match = str.trim().match(/^(\w+)\s+(\d+),?\s+(\d{4})$/);
  if (!match) return null;
  const monthIndex = MONTH_NAMES.indexOf(match[1].toLowerCase());
  if (monthIndex === -1) return null;
  return {
    month: monthIndex + 1,
    day: parseInt(match[2], 10),
    year: parseInt(match[3], 10),
  };
}

function parseBirthTime(str: unknown): { hour24: number; minute: number } | null {
  if (typeof str !== "string") return null;
  const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;
  return { hour24: hour, minute };
}

function isBirthPlaceAnswer(value: unknown): value is {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  provider: string;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.latitude === "number" &&
    typeof candidate.longitude === "number" &&
    typeof candidate.city === "string" &&
    typeof candidate.country === "string"
  );
}

async function maybeComputeChart(
  sessionId: string,
  incomingStepId: string,
  incomingValue: unknown
): Promise<Record<string, unknown>> {
  if (incomingStepId !== "birth-place") return {};
  if (!isBirthPlaceAnswer(incomingValue)) return {};

  const session = await getOnboardingSession(sessionId);
  if (!session) return {};

  const dateAnswer = parseBirthDate(session.answers["birth-date"]);
  if (!dateAnswer) return {};

  const timeAnswer = parseBirthTime(session.answers["birth-time"]);
  const hasTime = timeAnswer !== null;

  let utcHour = 0;
  let utcMinute = 0;
  let utcDay = dateAnswer.day;
  let utcMonth = dateAnswer.month;
  let utcYear = dateAnswer.year;

  if (hasTime && timeAnswer) {
    const lonOffsetHours = Math.round((incomingValue.longitude / 15) * 2) / 2;
    const converted = localToUTC(
      dateAnswer.year,
      dateAnswer.month,
      dateAnswer.day,
      timeAnswer.hour24,
      timeAnswer.minute,
      lonOffsetHours
    );
    utcHour = converted.hour;
    utcMinute = converted.minute;
    utcDay = converted.day;
    utcMonth = converted.month;
    utcYear = converted.year;
  }

  const birthData: BirthData = {
    year: utcYear,
    month: utcMonth,
    day: utcDay,
    hour: utcHour,
    minute: utcMinute,
    latitude: incomingValue.latitude,
    longitude: incomingValue.longitude,
    hasTime,
    localYear: dateAnswer.year,
    localMonth: dateAnswer.month,
    localDay: dateAnswer.day,
  };

  chartLogger.info("input.birth_date", { dateAnswer });
  chartLogger.info("input.birth_time", {
    timeAnswer: timeAnswer ?? "(no time - defaulting to noon)",
  });
  chartLogger.info("input.birth_place", {
    city: incomingValue.city,
    country: incomingValue.country,
    latitude: incomingValue.latitude,
    longitude: incomingValue.longitude,
  });
  chartLogger.info("input.utc_offset", {
    utcOffsetHours:
      hasTime && timeAnswer ? Math.round((incomingValue.longitude / 15) * 2) / 2 : 0,
  });
  chartLogger.info("input.birth_data", { birthData });

  try {
    const chart = computeChart(birthData);

    chartLogger.info("output.big_three", {
      sun: chart.sunSign,
      moon: chart.moonSign,
      rising: chart.risingSign,
      ascendantDeg: chart.ascendant.toFixed(2),
      midheavenDeg: chart.midheaven.toFixed(2),
      lifePath: chart.lifePath,
      element: chart.element,
      modality: chart.modality,
    });
    chartLogger.info("output.planets", {
      count: chart.planets.length,
      planets: chart.planets.map((planet) => ({
        planet: planet.planet,
        sign: planet.sign,
        degree: planet.degree.toFixed(2),
        longitude: planet.longitude.toFixed(2),
        house: planet.house,
        retrograde: planet.retrograde,
      })),
    });

    return { computedChart: chart };
  } catch (error) {
    chartLogger.error("computation.failed", { error });
    return {};
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return observeApiRoute({
    scope: "api.onboarding.session.answer.POST",
    request: req,
    handler: async () => {
      try {
        const params = SessionParamsSchema.parse(await ctx.params);
        const body = await req.json();
        const input = SaveOnboardingAnswerRequestSchema.parse(body);
        logger.info("request.validated", {
          sessionId: params.sessionId,
          stepId: input.stepId,
          currentStep: input.currentStep ?? null,
        });

        const extraAnswers = await maybeComputeChart(params.sessionId, input.stepId, input.value);

        let session = await saveOnboardingAnswer(params.sessionId, input);
        if (!session) {
          return NextResponse.json({ error: "not_found" }, { status: 404 });
        }

        if (Object.keys(extraAnswers).length > 0) {
          logger.info("chart.computed", {
            sessionId: params.sessionId,
            stepId: input.stepId,
          });
          session = await saveOnboardingAnswer(params.sessionId, {
            stepId: "computedChart",
            value: extraAnswers.computedChart,
          });
          if (!session) {
            return NextResponse.json({ error: "not_found" }, { status: 404 });
          }
        }

        return NextResponse.json(session);
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
