import { AppError } from "../../errors";
import type { ProviderCreditPolicy } from "./provider-credit-policy";

export type CreditMode = "normal" | "warning" | "protection" | "emergency";

export interface ProviderCreditConsumeInput {
  featureKey: string;
  credits?: number;
}

export interface ProviderCreditSnapshot {
  allowed: boolean;
  reason: string;
  globalDailyUsed: number;
  globalMonthlyUsed: number;
  featureDailyUsed: number;
  globalDailyCap: number;
  globalMonthlyCap: number;
  featureDailyCap: number | null;
}

export interface ProviderCreditDecision extends ProviderCreditSnapshot {
  mode: CreditMode;
}

export interface ProviderCreditStore {
  consumeProviderCredits(input: {
    featureKey: string;
    credits: number;
    globalDailyCap: number;
    globalMonthlyCap: number;
    featureDailyCap: number | null;
  }): Promise<ProviderCreditSnapshot>;
}

export function computeCreditMode(
  monthlyUsed: number,
  monthlyCap: number,
  policy: Pick<ProviderCreditPolicy, "warningPct" | "protectionPct" | "emergencyPct">
): CreditMode {
  const ratio = monthlyCap <= 0 ? 1 : monthlyUsed / monthlyCap;
  if (ratio >= policy.emergencyPct) return "emergency";
  if (ratio >= policy.protectionPct) return "protection";
  if (ratio >= policy.warningPct) return "warning";
  return "normal";
}

export class ProviderCreditGuard {
  constructor(
    private readonly store: ProviderCreditStore,
    private readonly policy: ProviderCreditPolicy
  ) {}

  async consume(input: ProviderCreditConsumeInput): Promise<ProviderCreditDecision> {
    const credits = input.credits ?? 1;
    const featureDailyCap = this.policy.featureDailyCaps[input.featureKey] ?? null;

    const snapshot = await this.store.consumeProviderCredits({
      featureKey: input.featureKey,
      credits,
      globalDailyCap: this.policy.globalDailyCap,
      globalMonthlyCap: this.policy.globalMonthlyCap,
      featureDailyCap,
    });

    const mode = computeCreditMode(
      snapshot.globalMonthlyUsed,
      snapshot.globalMonthlyCap,
      this.policy
    );

    if (!snapshot.allowed) {
      throw new AppError(
        `Provider credit guard blocked request: ${snapshot.reason}`,
        "PROVIDER_CREDIT_CAP_EXCEEDED",
        429
      );
    }

    return { ...snapshot, mode };
  }
}

