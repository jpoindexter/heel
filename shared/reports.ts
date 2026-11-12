import { z } from "zod";
import { PROVIDER_IDS } from "./providers";

export const ReportKindSchema = z.enum(["bug", "idea", "debug", "crash"]);
export const DiagnosticEventSchema = z.strictObject({
  at: z.number(), level: z.enum(["info", "warn", "error"]),
  area: z.enum(["panel", "mascot", "notice", "layers", "helper", "unknown"]),
  event: z.enum(["view_changed", "helper_starting", "helper_running", "helper_restarting", "helper_stopped", "error", "crash"]),
});
export const DiagnosticsSchema = z.strictObject({
  version: z.string().max(30), os: z.string().max(120), helperReached: z.boolean(),
  node: z.string().max(40).nullable(), database: z.number().int().nullable(), provider: z.enum(PROVIDER_IDS).nullable(),
  attention: z.boolean().nullable(), crashed: z.boolean(),
  counts: z.strictObject({ tasks: z.number().int(), parked: z.number().int(), documents: z.number().int() }).nullable(),
  events: z.array(DiagnosticEventSchema).max(80),
});
export const FeedbackReportSchema = z.strictObject({
  id: z.uuid(), kind: ReportKindSchema, title: z.string().trim().min(1).max(120).regex(/^[^\r\n]+$/),
  what: z.string().trim().min(1).max(3000), more: z.string().trim().max(3000),
  diagnostics: DiagnosticsSchema.nullable(),
});
export const FeedbackReceiptSchema = z.strictObject({
  id: z.uuid(), storedAt: z.iso.datetime(), notification: z.enum(["sent", "pending", "failed", "uncertain"]),
});
export type Diagnostics = z.infer<typeof DiagnosticsSchema>;
export type FeedbackReport = z.infer<typeof FeedbackReportSchema>;
export type FeedbackReceipt = z.infer<typeof FeedbackReceiptSchema>;
