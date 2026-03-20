import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createServerLogger, durationMs } from "@/server/foundation/observability/logger";
import {
  type CompleteOnboardingSessionRequest,
  type CreateOnboardingSessionRequest,
  type OnboardingSession,
  OnboardingSessionSchema,
  type SaveOnboardingAnswerRequest,
  type UpdateOnboardingSessionRequest,
} from "@/lib/onboarding/contracts";
import { resolveDataDir } from "@/lib/server/resolve-data-dir";

const ONBOARDING_DATA_ROOT = resolveDataDir("ONBOARDING_DATA_DIR", "onboarding-sessions");
const logger = createServerLogger("onboarding.store");

function toSessionFilePath(sessionId: string) {
  return path.join(ONBOARDING_DATA_ROOT, `${sessionId}.json`);
}

async function ensureDataDir() {
  await fs.mkdir(ONBOARDING_DATA_ROOT, { recursive: true });
}

async function writeSession(session: OnboardingSession) {
  const parsed = OnboardingSessionSchema.parse(session);
  const filePath = toSessionFilePath(parsed.sessionId);
  const tempPath = `${filePath}.tmp`;

  await ensureDataDir();
  await fs.writeFile(tempPath, JSON.stringify(parsed, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

async function readSession(sessionId: string): Promise<OnboardingSession | null> {
  const filePath = toSessionFilePath(sessionId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const result = OnboardingSessionSchema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw error;
  }
}

export async function createOnboardingSession(
  input: CreateOnboardingSessionRequest
): Promise<OnboardingSession> {
  const startedAt = Date.now();
  const now = new Date().toISOString();
  const session: OnboardingSession = {
    sessionId: randomUUID(),
    category: input.category,
    createdAt: now,
    updatedAt: now,
    status: "active",
    currentStep: 0,
    source: input.source,
    campaign: input.campaign,
    answers: {},
    events: [
      {
        id: randomUUID(),
        createdAt: now,
        type: "session_created",
      },
    ],
  };

  await writeSession(session);
  logger.info("create.success", {
    durationMs: durationMs(startedAt),
    outcome: "success",
    sessionId: session.sessionId,
    category: session.category,
    source: session.source ?? null,
  });
  return session;
}

export async function getOnboardingSession(
  sessionId: string
): Promise<OnboardingSession | null> {
  const startedAt = Date.now();
  const session = await readSession(sessionId);
  logger.info("get.complete", {
    durationMs: durationMs(startedAt),
    outcome: session ? "hit" : "miss",
    sessionId,
    status: session?.status ?? null,
  });
  return session;
}

export async function saveOnboardingAnswer(
  sessionId: string,
  payload: SaveOnboardingAnswerRequest
): Promise<OnboardingSession | null> {
  const startedAt = Date.now();
  const session = await readSession(sessionId);
  if (!session) return null;

  const now = new Date().toISOString();
  const updated: OnboardingSession = {
    ...session,
    updatedAt: now,
    currentStep:
      typeof payload.currentStep === "number"
        ? payload.currentStep
        : session.currentStep,
    answers: {
      ...session.answers,
      [payload.stepId]: payload.value,
    },
    events: [
      ...session.events,
      {
        id: randomUUID(),
        createdAt: now,
        type: "answer_saved",
        stepId: payload.stepId,
      },
    ],
  };

  await writeSession(updated);
  logger.info("saveAnswer.success", {
    durationMs: durationMs(startedAt),
    outcome: "success",
    sessionId,
    stepId: payload.stepId,
    currentStep: updated.currentStep,
  });
  return updated;
}

export async function updateOnboardingSession(
  sessionId: string,
  payload: UpdateOnboardingSessionRequest
): Promise<OnboardingSession | null> {
  const startedAt = Date.now();
  const session = await readSession(sessionId);
  if (!session) return null;

  const now = new Date().toISOString();
  const event = payload.event
    ? {
        id: randomUUID(),
        createdAt: now,
        type: payload.event.type,
        stepId: payload.event.stepId,
        payload: payload.event.payload,
      }
    : null;

  const updated: OnboardingSession = {
    ...session,
    updatedAt: now,
    currentStep:
      typeof payload.currentStep === "number"
        ? payload.currentStep
        : session.currentStep,
    status: payload.status ?? session.status,
    events: event ? [...session.events, event] : session.events,
  };

  await writeSession(updated);
  logger.info("update.success", {
    durationMs: durationMs(startedAt),
    outcome: "success",
    sessionId,
    status: updated.status,
    currentStep: updated.currentStep,
    eventType: payload.event?.type ?? null,
  });
  return updated;
}

export async function completeOnboardingSession(
  sessionId: string,
  payload: CompleteOnboardingSessionRequest
): Promise<OnboardingSession | null> {
  const startedAt = Date.now();
  const session = await readSession(sessionId);
  if (!session) return null;

  const now = new Date().toISOString();
  const updated: OnboardingSession = {
    ...session,
    updatedAt: now,
    status: "completed",
    leadEmail: payload.leadEmail ?? session.leadEmail,
    leadPhone: payload.leadPhone ?? session.leadPhone,
    events: [
      ...session.events,
      {
        id: randomUUID(),
        createdAt: now,
        type: "session_completed",
      },
    ],
  };

  await writeSession(updated);
  logger.info("complete.success", {
    durationMs: durationMs(startedAt),
    outcome: "success",
    sessionId,
    hasLeadEmail: Boolean(payload.leadEmail),
    hasLeadPhone: Boolean(payload.leadPhone),
  });
  return updated;
}
