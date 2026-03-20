import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestObservabilityContext {
  traceId: string;
  requestId: string;
  method: string;
  pathname: string;
  origin?: string;
}

const observabilityStorage = new AsyncLocalStorage<RequestObservabilityContext>();

export function runWithObservabilityContext<T>(
  context: RequestObservabilityContext,
  callback: () => Promise<T> | T
): Promise<T> | T {
  return observabilityStorage.run(context, callback);
}

export function getObservabilityContext(): RequestObservabilityContext | undefined {
  return observabilityStorage.getStore();
}

export function getObservabilityTraceId(): string | undefined {
  return observabilityStorage.getStore()?.traceId;
}
