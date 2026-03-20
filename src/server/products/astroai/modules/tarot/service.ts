import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/foundation/errors";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import type { TarotCardDTO, TarotDeckDTO, MagicBallPoolDTO, MagicBallAnswerDTO } from "./types";

const MAGIC_BALL_QUESTIONS = [
  "Will things improve soon?",
  "Am I on the right path?",
  "Should I take a leap of faith?",
  "Is this decision the right one?",
  "Will my efforts be rewarded?",
  "Should I trust my instincts here?",
  "Is now a good time to act?",
  "Am I aligned with my purpose?",
];

interface TarotRow {
  id: string;
  name: string;
  number: number;
  arcana: string;
  suit: string | null;
  upright_meaning: string;
  reversed_meaning: string;
  tip_of_day: string | null;
  image_slug: string | null;
}

interface MagicBallRow {
  id: string;
  answer: string;
  sentiment: string;
}

function tarotRowToDTO(row: TarotRow): TarotCardDTO {
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    arcana: row.arcana as "major" | "minor",
    suit: row.suit,
    uprightMeaning: row.upright_meaning,
    reversedMeaning: row.reversed_meaning,
    tipOfDay: row.tip_of_day,
    imageSlug: row.image_slug,
  };
}

export class TarotService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getDeck(): Promise<TarotDeckDTO> {
    const logger = createServerLogger("astroai.tarot.service");
    const startedAt = Date.now();
    logger.info("getDeck.start");
    const { data, error } = await this.supabase
      .schema("astro_artifacts")
      .from("tarot_cards")
      .select("id, name, number, arcana, suit, upright_meaning, reversed_meaning, tip_of_day, image_slug")
      .order("arcana", { ascending: true })
      .order("number", { ascending: true });

    if (error) {
      logger.error("getDeck.error", {
        durationMs: durationMs(startedAt),
        error,
      });
      throw new AppError(`Failed to load tarot deck: ${error.message}`, "DB_ERROR", 500);
    }

    const cards = ((data as TarotRow[] | null) ?? []).map(tarotRowToDTO);
    logger.info("getDeck.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      count: cards.length,
    });
    return {
      cards,
    };
  }

  async getCard(id: string): Promise<TarotCardDTO> {
    const logger = createServerLogger("astroai.tarot.service");
    const startedAt = Date.now();
    logger.info("getCard.start", { id });
    const { data, error } = await this.supabase
      .schema("astro_artifacts")
      .from("tarot_cards")
      .select("id, name, number, arcana, suit, upright_meaning, reversed_meaning, tip_of_day, image_slug")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logger.error("getCard.error", {
        durationMs: durationMs(startedAt),
        id,
        error,
      });
      throw new AppError(`Failed to load tarot card: ${error.message}`, "DB_ERROR", 500);
    }
    if (!data) {
      logger.warn("getCard.not_found", {
        durationMs: durationMs(startedAt),
        id,
      });
      throw new AppError(`Tarot card not found: ${id}`, "NOT_FOUND", 404);
    }

    const card = tarotRowToDTO(data as TarotRow);
    logger.info("getCard.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      id,
    });
    return card;
  }

  async getMagicBallPool(): Promise<MagicBallPoolDTO> {
    const logger = createServerLogger("astroai.tarot.service");
    const startedAt = Date.now();
    logger.info("getMagicBallPool.start");
    const { data, error } = await this.supabase
      .schema("astro_artifacts")
      .from("magic_ball_answer_pool")
      .select("id, answer, sentiment")
      .eq("is_active", true)
      .eq("locale", "en")
      .order("weight", { ascending: false });

    if (error) {
      logger.error("getMagicBallPool.error", {
        durationMs: durationMs(startedAt),
        error,
      });
      throw new AppError(`Failed to load magic ball pool: ${error.message}`, "DB_ERROR", 500);
    }

    const answers: MagicBallAnswerDTO[] = ((data as MagicBallRow[] | null) ?? []).map((row) => ({
      id: row.id,
      answer: row.answer,
      sentiment: row.sentiment as MagicBallAnswerDTO["sentiment"],
    }));

    logger.info("getMagicBallPool.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      count: answers.length,
    });
    return {
      answers,
      suggestedQuestions: MAGIC_BALL_QUESTIONS,
    };
  }
}
