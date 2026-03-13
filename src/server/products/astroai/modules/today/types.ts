import type { ApiEnvelope } from "../../contracts";

export interface TodayDTO {
  moon: {
    phaseName: string;
    illuminationPct: number;
    sign: string | null;
  };
  transits: Array<{
    title: string | null;
    transitingPlanet: string;
    targetPlanet: string | null;
    aspectType: string | null;
    interpretation: string | null;
  }>;
  events: Array<{
    title: string;
    eventType: string;
    significance: "low" | "medium" | "high";
    eventAt: string;
  }>;
}

export type TodayResponse = ApiEnvelope<TodayDTO>;

