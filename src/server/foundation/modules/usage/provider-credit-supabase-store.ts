import type { ProviderCreditSnapshot, ProviderCreditStore } from "./provider-credit-guard";

interface SupabaseRpcResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

interface SupabaseLikeClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<SupabaseRpcResponse<Record<string, unknown>[]>>;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export class SupabaseProviderCreditStore implements ProviderCreditStore {
  constructor(private readonly supabase: SupabaseLikeClient) {}

  async consumeProviderCredits(input: {
    featureKey: string;
    credits: number;
    globalDailyCap: number;
    globalMonthlyCap: number;
    featureDailyCap: number | null;
  }): Promise<ProviderCreditSnapshot> {
    const { data, error } = await this.supabase.rpc("consume_provider_credits", {
      p_feature_key: input.featureKey,
      p_credits: input.credits,
      p_global_daily_cap: input.globalDailyCap,
      p_global_monthly_cap: input.globalMonthlyCap,
      p_feature_daily_cap: input.featureDailyCap,
    });

    if (error) {
      throw new Error(`Failed to consume provider credits: ${error.message}`);
    }

    const row = data?.[0];
    if (!row) {
      throw new Error("Provider credit RPC returned no rows.");
    }

    return {
      allowed: asBoolean(row.allowed),
      reason: asString(row.reason, "unknown"),
      globalDailyUsed: asNumber(row.global_daily_used),
      globalMonthlyUsed: asNumber(row.global_monthly_used),
      featureDailyUsed: asNumber(row.feature_daily_used),
      globalDailyCap: asNumber(row.global_daily_cap, input.globalDailyCap),
      globalMonthlyCap: asNumber(row.global_monthly_cap, input.globalMonthlyCap),
      featureDailyCap:
        row.feature_daily_cap === null || row.feature_daily_cap === undefined
          ? null
          : asNumber(row.feature_daily_cap),
    };
  }
}

