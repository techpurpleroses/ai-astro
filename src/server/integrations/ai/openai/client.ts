import OpenAI from "openai";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import type { AdvisorPromptInput, AdvisorPromptOutput } from "./contracts";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

const ADVISOR_MODEL = process.env.OPENAI_ADVISOR_MODEL ?? "gpt-4o-mini";

export async function callAdvisorChat(input: AdvisorPromptInput): Promise<AdvisorPromptOutput> {
  const logger = createServerLogger("integrations.openai.advisor-chat");
  const startedAt = Date.now();
  const client = getOpenAIClient();
  logger.info("request.start", {
    sessionId: input.sessionId,
    model: ADVISOR_MODEL,
    userMessageChars: input.userMessage.length,
  });

  const completion = await client.chat.completions.create({
    model: ADVISOR_MODEL,
    messages: [
      { role: "system", content: input.advisorSystemPrompt },
      { role: "user", content: input.userMessage },
    ],
    max_tokens: 512,
    temperature: 0.75,
  });

  const choice = completion.choices[0];
  const content = choice?.message?.content ?? "I'm here to guide you. Please tell me more.";
  const usage = completion.usage;
  logger.info("request.success", {
    durationMs: durationMs(startedAt),
    outcome: "success",
    sessionId: input.sessionId,
    model: ADVISOR_MODEL,
    totalTokens: usage?.total_tokens ?? 0,
  });

  return {
    content,
    model: ADVISOR_MODEL,
    tokenUsage: {
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  };
}
