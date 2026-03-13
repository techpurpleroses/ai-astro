import type { UUID, ISODate, ISODateTime } from "../../foundation/contracts";

export interface ResponseMeta {
  sourceProvider: string | null;
  freshnessStatus: "fresh" | "stale" | "expired";
  computedAt: ISODateTime | null;
  contractVersion: string;
  traceId: string;
  cacheHit?: boolean;
  degraded?: boolean;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ResponseMeta;
  errors: string[];
}

export interface SubjectRef {
  userId: UUID;
  subjectId: UUID;
}

export interface DateScopedQuery {
  date: ISODate;
  systemType: "western" | "vedic" | "chinese" | "indian_lunar" | "indian_solar" | "mayan" | "druid";
}
