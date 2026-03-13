import type { ApiEnvelope } from "../../contracts";

export interface BirthChartDTO {
  chartType: string;
  systemType: string;
  zodiacType: string;
  houseSystem: string;
  sunSign: string;
  moonSign: string | null;
  risingSign: string | null;
  bodies: Array<Record<string, unknown>>;
  houses: Array<Record<string, unknown>>;
  aspects: Array<Record<string, unknown>>;
}

export type BirthChartResponse = ApiEnvelope<BirthChartDTO>;

