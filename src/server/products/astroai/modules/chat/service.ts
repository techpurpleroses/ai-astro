import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/foundation/errors";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import { callAdvisorChat } from "@/server/integrations/ai/openai/client";
import type {
  ChatHistoryDTO,
  ChatMessageDTO,
  ChatSessionDTO,
  SendMessageInput,
  SendMessageResult,
} from "./types";

interface SessionRow {
  id: string;
  status: string;
  started_at: string;
  advisor_id: string;
  advisors: { slug: string } | null;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  created_at: string;
  advisor_id: string;
  advisors: { slug: string } | null;
}

interface AdvisorRow {
  id: string;
  slug: string;
  system_prompt: string | null;
}

function sessionToDTO(row: SessionRow): ChatSessionDTO {
  return {
    id: row.id,
    status: row.status as ChatSessionDTO["status"],
    startedAt: row.started_at,
    advisorSlug: row.advisors?.slug ?? "",
  };
}

function messageToDTO(row: MessageRow): ChatMessageDTO {
  return {
    id: row.id,
    advisorId: row.advisors?.slug ?? row.advisor_id,
    role: row.role as ChatMessageDTO["role"],
    content: row.content,
    timestamp: row.created_at,
  };
}

export class ChatService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getHistory(userId: string, advisorSlug: string): Promise<ChatHistoryDTO> {
    const logger = createServerLogger("astroai.chat.service");
    const startedAt = Date.now();
    logger.info("getHistory.start", { userId, advisorSlug });
    const { data: sessionData, error: sessionError } = await this.supabase
      .schema("chat")
      .from("chat_sessions")
      .select("id, status, started_at, advisor_id, advisors(slug)")
      .eq("user_id", userId)
      .eq("advisors.slug", advisorSlug)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      logger.error("getHistory.session_error", {
        durationMs: durationMs(startedAt),
        advisorSlug,
        error: sessionError,
      });
      throw new AppError(`Failed to load chat session: ${sessionError.message}`, "DB_ERROR", 500);
    }

    if (!sessionData) {
      logger.info("getHistory.empty", {
        durationMs: durationMs(startedAt),
        outcome: "empty",
        advisorSlug,
      });
      return { session: null, messages: [] };
    }

    const session = sessionData as unknown as SessionRow;
    const { data: msgData, error: msgError } = await this.supabase
      .schema("chat")
      .from("chat_messages")
      .select("id, role, content, created_at, advisor_id, advisors(slug)")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (msgError) {
      logger.error("getHistory.messages_error", {
        durationMs: durationMs(startedAt),
        advisorSlug,
        sessionId: session.id,
        error: msgError,
      });
      throw new AppError(`Failed to load messages: ${msgError.message}`, "DB_ERROR", 500);
    }

    const result = {
      session: sessionToDTO(session),
      messages: ((msgData as unknown as MessageRow[]) ?? []).map(messageToDTO),
    };
    logger.info("getHistory.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      advisorSlug,
      sessionId: session.id,
      messageCount: result.messages.length,
    });
    return result;
  }

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const logger = createServerLogger("astroai.chat.service");
    const startedAt = Date.now();
    logger.info("sendMessage.start", {
      userId: input.userId,
      advisorSlug: input.advisorSlug,
      hasSessionId: Boolean(input.sessionId),
      contentChars: input.content.length,
    });
    const { data: advisorData, error: advisorError } = await this.supabase
      .schema("chat")
      .from("advisors")
      .select("id, slug, system_prompt")
      .eq("slug", input.advisorSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (advisorError || !advisorData) {
      logger.warn("sendMessage.advisor_missing", {
        durationMs: durationMs(startedAt),
        advisorSlug: input.advisorSlug,
      });
      throw new AppError(`Advisor not found: ${input.advisorSlug}`, "NOT_FOUND", 404);
    }

    const advisor = advisorData as AdvisorRow;

    let sessionId = input.sessionId;

    if (!sessionId) {
      const { data: newSession, error: sessionCreateError } = await this.supabase
        .schema("chat")
        .from("chat_sessions")
        .insert({
          user_id: input.userId,
          advisor_id: advisor.id,
          status: "active",
        })
        .select("id")
        .single();

      if (sessionCreateError || !newSession) {
        logger.error("sendMessage.session_create_error", {
          durationMs: durationMs(startedAt),
          advisorSlug: input.advisorSlug,
          error: sessionCreateError,
        });
        throw new AppError(
          `Failed to create chat session: ${sessionCreateError?.message ?? "unknown"}`,
          "DB_ERROR",
          500
        );
      }
      sessionId = (newSession as { id: string }).id;
      logger.info("sendMessage.session_created", {
        durationMs: durationMs(startedAt),
        outcome: "success",
        sessionId,
      });
    }

    const { data: userMsgData, error: userMsgError } = await this.supabase
      .schema("chat")
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        user_id: input.userId,
        advisor_id: advisor.id,
        role: "user",
        content: input.content,
      })
      .select("id, role, content, created_at, advisor_id")
      .single();

    if (userMsgError || !userMsgData) {
      logger.error("sendMessage.user_message_error", {
        durationMs: durationMs(startedAt),
        sessionId,
        error: userMsgError,
      });
      throw new AppError(
        `Failed to save user message: ${userMsgError?.message ?? "unknown"}`,
        "DB_ERROR",
        500
      );
    }

    const systemPrompt =
      advisor.system_prompt ??
      `You are ${input.advisorSlug}, a professional astrology advisor. Be helpful, warm, and insightful.`;

    const aiResponse = await callAdvisorChat({
      sessionId,
      userMessage: input.content,
      advisorSystemPrompt: systemPrompt,
      traceId: sessionId,
    });

    const { data: advisorMsgData, error: advisorMsgError } = await this.supabase
      .schema("chat")
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        user_id: input.userId,
        advisor_id: advisor.id,
        role: "advisor",
        content: aiResponse.content,
        model: aiResponse.model,
        token_usage: aiResponse.tokenUsage,
      })
      .select("id, role, content, created_at, advisor_id")
      .single();

    if (advisorMsgError || !advisorMsgData) {
      logger.error("sendMessage.advisor_message_error", {
        durationMs: durationMs(startedAt),
        sessionId,
        error: advisorMsgError,
      });
      throw new AppError(
        `Failed to save advisor message: ${advisorMsgError?.message ?? "unknown"}`,
        "DB_ERROR",
        500
      );
    }

    const session: ChatSessionDTO = {
      id: sessionId,
      status: "active",
      startedAt: new Date().toISOString(),
      advisorSlug: input.advisorSlug,
    };

    const userMsg = userMsgData as { id: string; role: string; content: string; created_at: string; advisor_id: string };
    const advisorMsg = advisorMsgData as { id: string; role: string; content: string; created_at: string; advisor_id: string };

    const result: SendMessageResult = {
      session,
      userMessage: {
        id: userMsg.id,
        advisorId: input.advisorSlug,
        role: "user",
        content: userMsg.content,
        timestamp: userMsg.created_at,
      },
      advisorMessage: {
        id: advisorMsg.id,
        advisorId: input.advisorSlug,
        role: "advisor",
        content: advisorMsg.content,
        timestamp: advisorMsg.created_at,
      },
    };
    logger.info("sendMessage.success", {
      durationMs: durationMs(startedAt),
      outcome: "success",
      sessionId,
      model: aiResponse.model,
      totalTokens: aiResponse.tokenUsage.totalTokens,
    });
    return result;
  }
}
