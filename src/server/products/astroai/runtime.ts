import { defaultProviderCreditPolicy } from "../../foundation/modules/usage/provider-credit-policy";
import { ProviderCreditGuard } from "../../foundation/modules/usage/provider-credit-guard";
import { SupabaseProviderCreditStore } from "../../foundation/modules/usage/provider-credit-supabase-store";
import { AstrologyApiIoClient } from "../../integrations/astrology/astrology-api-io-client";
import { getServiceRoleSupabaseClient } from "../../integrations/supabase";
import { AdvisorsService } from "./modules/advisors/service";
import { ChatService } from "./modules/chat/service";
import { BirthChartService } from "./modules/birth-chart/service";
import { SupabaseBirthChartCacheRepository } from "./modules/birth-chart/supabase-cache-repository";
import { CompatibilityService } from "./modules/compatibility/service";
import { SupabaseCompatibilityCacheRepository } from "./modules/compatibility/supabase-cache-repository";
import { HoroscopeService } from "./modules/horoscope/service";
import { SupabaseHoroscopeCacheRepository } from "./modules/horoscope/supabase-cache-repository";
import { ReportsService } from "./modules/reports/service";
import { StoriesService } from "./modules/stories/service";
import { TarotService } from "./modules/tarot/service";
import { TodayService } from "./modules/today/service";
import { SupabaseTodayCacheRepository } from "./modules/today/supabase-cache-repository";
import { AstrologyApiIoAstroAiGateway } from "./provider/astrology-api-io-gateway";

export interface AstroAiRuntime {
  todayService: TodayService;
  compatibilityService: CompatibilityService;
  birthChartService: BirthChartService;
  horoscopeService: HoroscopeService;
  advisorsService: AdvisorsService;
  storiesService: StoriesService;
  reportsService: ReportsService;
  tarotService: TarotService;
  chatService: ChatService;
}

let runtimeSingleton: AstroAiRuntime | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

export function getAstroAiRuntime(): AstroAiRuntime {
  if (runtimeSingleton) {
    return runtimeSingleton;
  }

  const provider = process.env.ASTROLOGY_PROVIDER ?? "astrology_api_io";
  if (provider !== "astrology_api_io") {
    throw new Error(`Unsupported ASTROLOGY_PROVIDER "${provider}". Implement provider adapter first.`);
  }

  const supabase = getServiceRoleSupabaseClient();
  const creditStore = new SupabaseProviderCreditStore({
    rpc: async (fn, args) => {
      // consume_provider_credits lives in `platform` schema (not `public`)
      const { data, error } = await supabase.schema('platform').rpc(fn, args);
      return {
        data: (data as Record<string, unknown>[] | null) ?? null,
        error: error ? { message: error.message } : null,
      };
    },
  });
  const creditGuard = new ProviderCreditGuard(creditStore, defaultProviderCreditPolicy);
  const client = new AstrologyApiIoClient({
    baseUrl: requiredEnv("ASTROLOGY_API_BASE_URL"),
    apiKey: requiredEnv("ASTROLOGY_API_KEY"),
    creditGuard,
  });
  const gateway = new AstrologyApiIoAstroAiGateway(client, supabase);

  runtimeSingleton = {
    todayService: new TodayService(new SupabaseTodayCacheRepository(supabase), gateway),
    compatibilityService: new CompatibilityService(
      new SupabaseCompatibilityCacheRepository(supabase),
      gateway
    ),
    birthChartService: new BirthChartService(new SupabaseBirthChartCacheRepository(supabase), gateway),
    horoscopeService: new HoroscopeService(new SupabaseHoroscopeCacheRepository(supabase), gateway),
    advisorsService: new AdvisorsService(supabase),
    storiesService: new StoriesService(supabase),
    reportsService: new ReportsService(supabase),
    tarotService: new TarotService(supabase),
    chatService: new ChatService(supabase),
  };

  return runtimeSingleton;
}
