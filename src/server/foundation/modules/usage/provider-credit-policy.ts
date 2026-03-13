export interface ProviderCreditPolicy {
  globalDailyCap: number;
  globalMonthlyCap: number;
  warningPct: number;
  protectionPct: number;
  emergencyPct: number;
  featureDailyCaps: Record<string, number>;
}

export const defaultProviderCreditPolicy: ProviderCreditPolicy = {
  globalDailyCap: 220,
  globalMonthlyCap: 7000,
  warningPct: 0.6,
  protectionPct: 0.8,
  emergencyPct: 0.95,
  featureDailyCaps: {
    "today.horoscope": 20,
    "today.moon": 20,
    "today.transits": 20,
    "compatibility.score": 60,
    "birth-chart.natal": 60,
    "birth-chart.natal-transits": 60,
    "numerology.core": 40,
    "tarot.daily": 20,
    "tarot.draw": 20,
  },
};

