import type { ApiEnvelope } from "../../contracts";

export interface CompatibilityDTO {
  signA: string;
  signB: string;
  overall: number;
  love: number;
  career: number;
  friendship: number;
  sex: number;
  summary: string;
  strengths: string[];
  challenges: string[];
}

export type CompatibilityResponse = ApiEnvelope<CompatibilityDTO>;

