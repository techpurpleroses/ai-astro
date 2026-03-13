import type { ApiEnvelope } from "../../contracts";

export interface TarotDrawDTO {
  drawType: "card_of_day" | "near_future" | "love" | "yes_no";
  cards: string[];
  result: Record<string, unknown>;
}

export interface PalmReadingDTO {
  handSide: "left" | "right" | "both";
  scores: Record<string, number>;
  insights: Record<string, unknown>;
}

export interface SoulmatchDTO {
  profile: Record<string, unknown>;
  imageUrl: string | null;
}

export type TarotDrawResponse = ApiEnvelope<TarotDrawDTO>;
export type PalmReadingResponse = ApiEnvelope<PalmReadingDTO>;
export type SoulmatchResponse = ApiEnvelope<SoulmatchDTO>;

