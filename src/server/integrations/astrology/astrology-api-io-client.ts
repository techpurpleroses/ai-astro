import type { ProviderCreditGuard } from "../../foundation/modules/usage/provider-credit-guard";

export interface AstrologyApiIoClientConfig {
  baseUrl: string;
  apiKey: string;
  creditGuard?: ProviderCreditGuard;
}

export interface AstrologyApiIoResponse<T = unknown> {
  status: number;
  remainingQuota: number | null;
  data: T;
}

export class AstrologyApiIoClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly creditGuard?: ProviderCreditGuard;

  constructor(config: AstrologyApiIoClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.creditGuard = config.creditGuard;
  }

  private async request<T>(params: {
    method: "GET" | "POST";
    path: string;
    featureKey: string;
    body?: Record<string, unknown>;
  }): Promise<AstrologyApiIoResponse<T>> {
    if (this.creditGuard) {
      await this.creditGuard.consume({ featureKey: params.featureKey, credits: 1 });
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-api-key": this.apiKey,
    };
    if (params.method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${this.baseUrl}${params.path}`, {
      method: params.method,
      headers,
      body: params.method === "POST" ? JSON.stringify(params.body ?? {}) : undefined,
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      throw new Error(
        `astrology_api_io ${params.path} failed (${res.status}): ${
          typeof data === "string" ? data : JSON.stringify(data)
        }`
      );
    }

    const quotaHeader = res.headers.get("x-remaining-quota");
    const remainingQuota = quotaHeader ? Number(quotaHeader) : null;

    return {
      status: res.status,
      remainingQuota: Number.isFinite(remainingQuota) ? remainingQuota : null,
      data: data as T,
    };
  }

  getDataNow<T = unknown>(): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "GET",
      path: "/api/v3/data/now",
      featureKey: "today.now",
    });
  }

  getLunarMetrics<T = unknown>(body: Record<string, unknown>): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/data/lunar-metrics",
      featureKey: "today.moon",
      body,
    });
  }

  getLunarEvents<T = unknown>(body: Record<string, unknown>): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/lunar/events",
      featureKey: "today.moon-events",
      body,
    });
  }

  getGlobalPositions<T = unknown>(body: Record<string, unknown>): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/data/global-positions",
      featureKey: "today.global-positions",
      body,
    });
  }

  getAspects<T = unknown>(body: Record<string, unknown>): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/data/aspects",
      featureKey: "today.transits",
      body,
    });
  }

  getTransitChart<T = unknown>(body: Record<string, unknown>): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/charts/transit",
      featureKey: "today.transits",
      body,
    });
  }

  getNatalChart<T = unknown>(body: Record<string, unknown>): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/charts/natal",
      featureKey: "birth-chart.natal",
      body,
    });
  }

  getNatalTransits<T = unknown>(body: Record<string, unknown>): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/charts/natal-transits",
      featureKey: "birth-chart.natal-transits",
      body,
    });
  }

  getCompatibilityScore<T = unknown>(
    body: Record<string, unknown>
  ): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/analysis/compatibility-score",
      featureKey: "compatibility.score",
      body,
    });
  }

  getNumerologyCoreNumbers<T = unknown>(
    body: Record<string, unknown>
  ): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/numerology/core-numbers",
      featureKey: "numerology.core",
      body,
    });
  }

  getHoroscopeSignDailyText<T = unknown>(
    body: Record<string, unknown>
  ): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/horoscope/sign/daily/text",
      featureKey: "today.horoscope",
      body,
    });
  }

  getTarotDailyCard<T = unknown>(): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "GET",
      path: "/api/v3/tarot/cards/daily",
      featureKey: "tarot.daily",
    });
  }

  drawTarot<T = unknown>(body: Record<string, unknown>): Promise<AstrologyApiIoResponse<T>> {
    return this.request<T>({
      method: "POST",
      path: "/api/v3/tarot/cards/draw",
      featureKey: "tarot.draw",
      body,
    });
  }
}

