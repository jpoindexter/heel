import { z } from "zod";
import { PROVIDER_IDS } from "./providers";

/** Wire contract between the sidecar server and the panel. Both sides validate with these. */

export const ProviderStatusSchema = z.object({
  id: z.enum(PROVIDER_IDS),
  label: z.string(),
  installed: z.boolean(),
  ready: z.boolean(),
  detail: z.string(),
});

export const BrainSettingsSchema = z.object({
  provider: z.enum(PROVIDER_IDS).nullable(),
  model: z.string().nullable(),
});

export const BrainStateSchema = z.object({
  settings: BrainSettingsSchema,
  providers: z.array(ProviderStatusSchema),
});

export const ModelsSchema = z.object({ models: z.array(z.string()) });

export const TestResultSchema = z.object({ detail: z.string() });

export const ConnectionInfoSchema = z.object({
  port: z.number().int().min(1).max(65535),
  token: z.string().min(16),
});

export const ApiErrorSchema = z.object({ code: z.string(), message: z.string() });

/** Expected failures are values (ok: false), not HTTP errors. HTTP errors mean auth or a malformed request. */
export const envelope = <T extends z.ZodType>(data: T) =>
  z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), error: ApiErrorSchema }),
  ]);

export type ProviderStatusDto = z.output<typeof ProviderStatusSchema>;
export type BrainSettingsDto = z.output<typeof BrainSettingsSchema>;
export type BrainStateDto = z.output<typeof BrainStateSchema>;
export type ConnectionInfo = z.output<typeof ConnectionInfoSchema>;
export type ApiError = z.output<typeof ApiErrorSchema>;
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const TOKEN_HEADER = "x-heel-token";
export const CONNECTION_FILE = "sidecar.json";
/** Bundle identifier. Must equal `identifier` in src-tauri/tauri.conf.json (a test enforces it). */
export const APP_ID = "studio.theft.heel";

/* Today tab */

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "doing", "done", "dropped"]),
  nowStep: z.string().nullable(),
  source: z.enum(["manual", "capture", "inbox"]),
  sourceRef: z.string().nullable(),
  position: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().nullable(),
});

export const TasksStateSchema = z.object({ tasks: z.array(TaskSchema), parkedCount: z.number().int() });
export const TaskResultSchema = z.object({ task: TaskSchema });
export const ParkedResultSchema = z.object({ id: z.string() });
export const TextInputSchema = z.object({ text: z.string() });

export const ActionOutcomeSchema = z.object({ type: z.string(), ok: z.boolean(), message: z.string() });

export const TurnResultSchema = z.object({
  say: z.string(),
  applied: z.array(ActionOutcomeSchema),
  skills: z.array(z.string()),
  provider: z.enum(PROVIDER_IDS),
});

export type TaskDto = z.output<typeof TaskSchema>;
export type TasksStateDto = z.output<typeof TasksStateSchema>;
export type TurnResultDto = z.output<typeof TurnResultSchema>;
export type ActionOutcomeDto = z.output<typeof ActionOutcomeSchema>;
