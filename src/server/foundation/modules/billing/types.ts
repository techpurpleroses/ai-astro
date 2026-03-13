import type { UUID, ISODateTime } from "../../contracts";

export interface SubscriptionDTO {
  id: UUID;
  userId: UUID;
  planCode: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "paused" | "incomplete";
  currentPeriodStart: ISODateTime | null;
  currentPeriodEnd: ISODateTime | null;
}

export interface EntitlementDTO {
  id: UUID;
  userId: UUID;
  featureKey: string;
  accessMode: "allow" | "deny" | "metered" | "subscription";
  tierRequired: string | null;
  creditsPerCall: number | null;
  dailyLimit: number | null;
}

