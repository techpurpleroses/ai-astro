import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/foundation/errors";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import type { AdvisorDTO, AdvisorsListDTO } from "./types";

interface AdvisorRow {
  slug: string;
  name: string;
  specialty: string;
  specialty_icon: string | null;
  tagline: string | null;
  bio: string | null;
  zodiac_sign: string | null;
  years_of_experience: number | null;
  skills: unknown;
  languages: unknown;
  rate_per_minute: number;
  rating: number;
  review_count: number;
  is_online: boolean;
  response_time: string | null;
  total_sessions: number;
  avatar_url: string | null;
}

function rowToDTO(row: AdvisorRow): AdvisorDTO {
  return {
    id: row.slug,
    name: row.name,
    specialty: row.specialty,
    specialtyIcon: row.specialty_icon ?? "",
    tagline: row.tagline ?? "",
    bio: row.bio ?? "",
    zodiacSign: row.zodiac_sign ?? "",
    yearsOfExperience: row.years_of_experience ?? 0,
    skills: Array.isArray(row.skills) ? (row.skills as string[]) : [],
    languages: Array.isArray(row.languages) ? (row.languages as string[]) : [],
    ratePerMinute: Number(row.rate_per_minute),
    rating: Number(row.rating),
    reviewCount: row.review_count,
    isOnline: row.is_online,
    responseTime: row.response_time ?? "",
    totalSessions: row.total_sessions,
    avatarUrl: row.avatar_url,
  };
}

export class AdvisorsService {
  constructor(private readonly supabase: SupabaseClient) {}

  async listAdvisors(userId?: string): Promise<AdvisorsListDTO> {
    const logger = createServerLogger("astroai.advisors.service");
    const startedAt = Date.now();
    logger.info("listAdvisors.start", { hasUserId: Boolean(userId) });

    const [advisorsResult, recentChats] = await Promise.all([
      this.supabase
        .schema("chat")
        .from("advisors")
        .select(
          "slug, name, specialty, specialty_icon, tagline, bio, zodiac_sign, years_of_experience, skills, languages, rate_per_minute, rating, review_count, is_online, response_time, total_sessions, avatar_url"
        )
        .eq("is_active", true)
        .order("rating", { ascending: false }),
      userId ? this._getRecentChats(userId) : Promise.resolve([]),
    ]);

    if (advisorsResult.error) {
      logger.error("listAdvisors.error", {
        durationMs: durationMs(startedAt),
        error: advisorsResult.error,
      });
      throw new AppError(`Failed to load advisors: ${advisorsResult.error.message}`, "DB_ERROR", 500);
    }

    const advisors = ((advisorsResult.data as AdvisorRow[] | null) ?? []).map(rowToDTO);
    logger.info("listAdvisors.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      count: advisors.length,
      recentChatsCount: recentChats.length,
    });
    return { advisors, recentChats };
  }

  private async _getRecentChats(userId: string): Promise<string[]> {
    const logger = createServerLogger("astroai.advisors.service");
    const { data, error } = await this.supabase
      .schema("chat")
      .from("chat_sessions")
      .select("advisor_id, advisors(slug)")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error || !data) {
      logger.warn("getRecentChats.error", { userId, error });
      return [];
    }

    // Deduplicate by advisor_id — keep insertion order (most recent first)
    const seen = new Set<string>();
    const slugs: string[] = [];
    for (const row of data as Array<{ advisor_id: string; advisors: { slug: string } | null }>) {
      const slug = row.advisors?.slug;
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        slugs.push(slug);
        if (slugs.length >= 5) break;
      }
    }
    return slugs;
  }

  async getAdvisor(slug: string): Promise<AdvisorDTO> {
    const logger = createServerLogger("astroai.advisors.service");
    const startedAt = Date.now();
    logger.info("getAdvisor.start", { slug });
    const { data, error } = await this.supabase
      .schema("chat")
      .from("advisors")
      .select(
        "slug, name, specialty, specialty_icon, tagline, bio, zodiac_sign, years_of_experience, skills, languages, rate_per_minute, rating, review_count, is_online, response_time, total_sessions, avatar_url"
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      logger.error("getAdvisor.error", {
        durationMs: durationMs(startedAt),
        slug,
        error,
      });
      throw new AppError(`Failed to load advisor: ${error.message}`, "DB_ERROR", 500);
    }
    if (!data) {
      logger.warn("getAdvisor.not_found", {
        durationMs: durationMs(startedAt),
        slug,
      });
      throw new AppError(`Advisor not found: ${slug}`, "NOT_FOUND", 404);
    }

    const advisor = rowToDTO(data as AdvisorRow);
    logger.info("getAdvisor.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      slug,
    });
    return advisor;
  }

  async getAdvisorSystemPrompt(slug: string): Promise<string | null> {
    const logger = createServerLogger("astroai.advisors.service");
    const startedAt = Date.now();
    const { data, error } = await this.supabase
      .schema("chat")
      .from("advisors")
      .select("system_prompt")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      logger.warn("getAdvisorSystemPrompt.miss", {
        durationMs: durationMs(startedAt),
        slug,
      });
      return null;
    }
    const row = data as { system_prompt: string | null };
    logger.info("getAdvisorSystemPrompt.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      slug,
      hasPrompt: Boolean(row.system_prompt),
    });
    return row.system_prompt;
  }
}
