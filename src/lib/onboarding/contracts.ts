import { z } from "zod";
import { ONBOARDING_CATEGORIES } from "@/lib/onboarding/config";

export const OnboardingCategorySchema = z.enum(ONBOARDING_CATEGORIES);
export const OnboardingSessionStatusSchema = z.enum([
  "active",
  "completed",
  "abandoned",
]);

export const OnboardingSessionEventSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  type: z.string().min(1).max(64),
  stepId: z.string().min(1).max(128).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const OnboardingSessionSchema = z.object({
  sessionId: z.string().uuid(),
  category: OnboardingCategorySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: OnboardingSessionStatusSchema,
  currentStep: z.number().int().min(0),
  source: z.string().min(1).max(120).optional(),
  campaign: z.string().min(1).max(120).optional(),
  leadEmail: z.string().email().optional(),
  leadPhone: z.string().min(6).max(30).optional(),
  answers: z.record(z.string(), z.unknown()),
  events: z.array(OnboardingSessionEventSchema),
});

export const CreateOnboardingSessionRequestSchema = z.object({
  category: OnboardingCategorySchema,
  source: z.string().min(1).max(120).optional(),
  campaign: z.string().min(1).max(120).optional(),
});

export const UpdateOnboardingSessionRequestSchema = z.object({
  currentStep: z.number().int().min(0).optional(),
  status: OnboardingSessionStatusSchema.optional(),
  event: z
    .object({
      type: z.string().min(1).max(64),
      stepId: z.string().min(1).max(128).optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

export const SaveOnboardingAnswerRequestSchema = z.object({
  stepId: z.string().min(1).max(128),
  value: z.unknown(),
  currentStep: z.number().int().min(0).optional(),
});

export const CompleteOnboardingSessionRequestSchema = z.object({
  leadEmail: z.string().email().optional(),
  leadPhone: z.string().min(6).max(30).optional(),
});

export type OnboardingCategory = z.infer<typeof OnboardingCategorySchema>;
export type OnboardingSessionStatus = z.infer<typeof OnboardingSessionStatusSchema>;
export type OnboardingSessionEvent = z.infer<typeof OnboardingSessionEventSchema>;
export type OnboardingSession = z.infer<typeof OnboardingSessionSchema>;
export type CreateOnboardingSessionRequest = z.infer<
  typeof CreateOnboardingSessionRequestSchema
>;
export type UpdateOnboardingSessionRequest = z.infer<
  typeof UpdateOnboardingSessionRequestSchema
>;
export type SaveOnboardingAnswerRequest = z.infer<
  typeof SaveOnboardingAnswerRequestSchema
>;
export type CompleteOnboardingSessionRequest = z.infer<
  typeof CompleteOnboardingSessionRequestSchema
>;

