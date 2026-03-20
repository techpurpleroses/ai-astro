export interface ChatSessionDTO {
  id: string;
  status: "active" | "ended" | "pending";
  startedAt: string;
  advisorSlug: string;
}

export interface ChatMessageDTO {
  id: string;
  advisorId: string;
  role: "user" | "advisor";
  content: string;
  timestamp: string;
}

export interface ChatHistoryDTO {
  session: ChatSessionDTO | null;
  messages: ChatMessageDTO[];
}

export interface SendMessageInput {
  userId: string;
  advisorSlug: string;
  content: string;
  sessionId?: string;
}

export interface SendMessageResult {
  session: ChatSessionDTO;
  userMessage: ChatMessageDTO;
  advisorMessage: ChatMessageDTO;
}
