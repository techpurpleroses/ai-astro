import type { UUID, ISODateTime } from "../../contracts";

export interface FeatureComputationDTO {
  id: UUID;
  featureKey: string;
  userId: UUID | null;
  subjectId: UUID | null;
  status: "queued" | "running" | "success" | "partial" | "failed" | "stale_served" | "canceled";
  freshnessStatus: "fresh" | "stale" | "expired";
  computedAt: ISODateTime | null;
  expiresAt: ISODateTime | null;
  contractVersion: string;
  mapperVersion: string;
}

export interface UsageEventDTO {
  id: UUID;
  userId: UUID | null;
  featureKey: string;
  action: string;
  units: number;
  createdAt: ISODateTime;
}

