import { z } from "zod";
import { SIZES } from "../../shared/method";

export const MAX_ACTIONS_PER_REPLY = 8;
export const MAX_SAY_CHARS = 1_200;

const taskRef = z.string().regex(/^t\d+$/, 'task must be a ref like "t1" from the task list');

/**
 * Everything the model may ask Heel to do. Local writes the user can undo (autonomy L1), plus draft_email: it only OPENS a draft
 * in Mail for the person to read and send themselves (autonomy L2: one-click confirm happens in Mail). Nothing here sends or deletes.
 */
export const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add_task"), title: z.string(), now_step: z.string().optional(), size: z.enum(SIZES).optional(), bucket: z.string().optional() }),
  z.object({ type: z.literal("complete_task"), task: taskRef }),
  z.object({ type: z.literal("drop_task"), task: taskRef }),
  z.object({ type: z.literal("set_now_step"), task: taskRef, step: z.string().nullable() }),
  z.object({ type: z.literal("park_idea"), idea: z.string(), why: z.string().optional() }),
  z.object({ type: z.literal("draft_email"), to: z.string().optional(), subject: z.string(), body: z.string().min(1) }),
  z.object({ type: z.literal("write_document"), title: z.string().min(1), body: z.string().min(1) }),
]);

export const AgentReplySchema = z.object({
  say: z.string().trim().min(1, "say can't be empty").max(MAX_SAY_CHARS, `say must be ${MAX_SAY_CHARS} characters or fewer`),
  actions: z.array(ActionSchema).max(MAX_ACTIONS_PER_REPLY, `at most ${MAX_ACTIONS_PER_REPLY} actions per reply`).default([]),
});

export type Action = z.output<typeof ActionSchema>;
export type AgentReply = z.output<typeof AgentReplySchema>;

export type ParseResult = { ok: true; reply: AgentReply } | { ok: false; error: string };

/** Pull the JSON object out of a model reply that may be wrapped in a code fence or prose. */
export function extractJson(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object found");
  return JSON.parse(unfenced.slice(start, end + 1));
}

export function parseAgentReply(text: string): ParseResult {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch {
    return { ok: false, error: "the reply was not a JSON object" };
  }
  const parsed = AgentReplySchema.safeParse(json);
  if (parsed.success) return { ok: true, reply: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
  return { ok: false, error: `${where}${issue?.message ?? "invalid reply"}` };
}
