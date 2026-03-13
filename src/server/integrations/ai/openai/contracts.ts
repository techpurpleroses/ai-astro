export interface AdvisorPromptInput {
  sessionId: string;
  userMessage: string;
  advisorSystemPrompt: string;
  traceId: string;
}

export interface AdvisorPromptOutput {
  content: string;
  model: string;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface SketchPromptInput {
  prompt: string;
  style: string;
  traceId: string;
}

