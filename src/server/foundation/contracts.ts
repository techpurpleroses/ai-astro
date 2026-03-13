export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export interface TraceContext {
  traceId: string;
  requestId?: string;
}

export interface UserScopedInput {
  userId: UUID;
  trace: TraceContext;
}

