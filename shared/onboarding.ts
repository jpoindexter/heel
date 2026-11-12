import { z } from "zod";

export const OnboardingStepSchema = z.number().int().min(0).max(3);
export const OnboardingStateSchema = z.object({ step: OnboardingStepSchema, taskId: z.string().nullable() });
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;
