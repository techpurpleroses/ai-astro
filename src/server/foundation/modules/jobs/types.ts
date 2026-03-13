import type { UUID, ISODateTime } from "../../contracts";

export interface FeatureJobDTO {
  id: UUID;
  jobType: string;
  featureKey: string;
  status: "queued" | "running" | "retrying" | "done" | "failed" | "dead";
  attempt: number;
  maxAttempts: number;
  runAfter: ISODateTime;
  createdAt: ISODateTime;
}

