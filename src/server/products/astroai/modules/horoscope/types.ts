import type { ApiEnvelope } from "../../contracts";

export interface HoroscopeQuery {
  date: string;
  systemType: string;
  sign: string;
}

export interface HoroscopeMainDTO {
  date: string;
  title: string;
  text: string;
  energy: number;
  emotionalTone: string;
  challenges: string[];
  opportunities: string[];
}

export interface HoroscopeCategoryDTO {
  text: string;
  rating: number;
  keywords: string[];
}

export interface HoroscopeDTO {
  main: HoroscopeMainDTO;
  categories: {
    "your-day": HoroscopeCategoryDTO;
    love: HoroscopeCategoryDTO;
    health: HoroscopeCategoryDTO;
    career: HoroscopeCategoryDTO;
  };
}

export type HoroscopeResponse = ApiEnvelope<HoroscopeDTO>;
