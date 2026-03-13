import type { AstrologyProviderKey } from "./provider-key";

export interface AstrologyProviderRequest {
  featureKey: string;
  systemType: string;
  payload: Record<string, unknown>;
  traceId: string;
}

export interface AstrologyProviderResponse {
  provider: AstrologyProviderKey;
  endpointKey: string;
  latencyMs: number;
  payload: Record<string, unknown>;
}

export interface AstrologyProviderClient {
  readonly key: AstrologyProviderKey;
  fetchFeature(input: AstrologyProviderRequest): Promise<AstrologyProviderResponse>;
}

