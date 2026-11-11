import { z } from "zod";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ApplicationStartSchema = z.object({ url: z.string().url().max(4096), facts: z.string().max(20_000).default("") });
export const AttachmentSchema = z.object({ id: z.string(), name: z.string(), bytes: z.number(), sha256: z.string() });
export const ApplicationFieldSchema = z.object({
  id: z.string(), label: z.string(), kind: z.string(), required: z.boolean(), value: z.string(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
});
export const ApplicationButtonSchema = z.object({ id: z.string(), label: z.string() });
export const PendingRequestSchema = z.object({ id: z.string(), url: z.string(), method: z.string(), body: z.string(), sha256: z.string() });
export const ApplicationViewSchema = z.object({
  id: z.string(), url: z.string(), title: z.string(), facts: z.string(),
  status: z.enum(["review", "submitted", "uncertain", "interrupted", "cancelled"]),
  message: z.string(), fields: z.array(ApplicationFieldSchema), buttons: z.array(ApplicationButtonSchema),
  pending: z.array(PendingRequestSchema), attachments: z.array(AttachmentSchema),
  review: z.string().nullable(), confirmation: z.string().nullable(),
  sent: z.array(z.object({ id: z.string(), url: z.string(), method: z.string(), sha256: z.string(), approvedAt: z.string(), httpStatus: z.number().nullable() })).default([]),
});
export const ApplicationStateSchema = z.object({ application: ApplicationViewSchema.nullable(), problem: z.string().nullable().optional() });
export const FillApplicationSchema = z.object({ facts: z.string().trim().min(1).max(20_000) });
export const EditApplicationSchema = z.object({
  values: z.array(z.object({ id: z.string(), value: z.string().max(20_000) })).max(150),
});
export const StageApplicationSchema = z.object({ button: z.string(), final: z.boolean(), review: z.string() });
export const ApproveApplicationSchema = z.object({ request: z.string(), review: z.string() });
export const AttachApplicationSchema = z.object({ field: z.string(), attachment: z.string() });
export const UploadApplicationSchema = z.object({ name: z.string().min(1).max(200), base64: z.string().max(Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4) });
const Point = { x: z.number().int().min(0).max(1099), y: z.number().int().min(0).max(849) };
export const BrowserStepSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), ...Point, final: z.boolean().default(false) }),
  z.object({ type: z.literal("type"), text: z.string().min(1).max(20_000), source: z.string().min(1) }),
  z.object({ type: z.literal("press"), key: z.enum(["Tab", "Shift+Tab", "Enter", "Escape", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Space", "Backspace", "ControlOrMeta+A"]) }),
  z.object({ type: z.literal("scroll"), dy: z.number().int().min(-850).max(850) }),
  z.object({ type: z.literal("attach"), ...Point, attachment: z.string() }),
  z.object({ type: z.literal("stop"), reason: z.string().min(1).max(1200) }),
]);
export const BrowserAssistSchema = z.object({ goal: z.string().trim().min(1).max(2000), facts: z.string().max(20_000) });
export const BrowserViewSchema = z.object({ image: z.string(), note: z.string(), steps: z.number().int(), width: z.number(), height: z.number() });
export const ObservedConfirmationSchema = z.object({ quote: z.string().trim().min(1).max(1200), accepted: z.literal(true) });
export type BrowserStep = z.output<typeof BrowserStepSchema>;
export type ApplicationView = z.output<typeof ApplicationViewSchema>;
export type ApplicationField = z.output<typeof ApplicationFieldSchema>;
export type ApplicationButton = z.output<typeof ApplicationButtonSchema>;
export type Attachment = z.output<typeof AttachmentSchema>;
export type PendingRequest = z.output<typeof PendingRequestSchema>;
