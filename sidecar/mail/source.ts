import { z } from "zod";
import type { RunCommand } from "../agent/providers/process";
import type { Candidate } from "../inbox/gmail";
import type { Outcome } from "../inbox/service";
import type { JxaRunner } from "./jxa";
import { LIST_UNREAD, NEW_DRAFT, REPLY } from "./scripts";

/** Mail from the last week that still needs the person; at most this many, with this much of each text. */
export const LOOK_BACK_DAYS = 7;
const MAX_CANDIDATES = 15;
const PREVIEW_CHARS = 300;

const Listed = z.object({
  items: z.array(z.object({ id: z.string(), from: z.string(), subject: z.string(), date: z.string(), preview: z.string() })),
  accounts: z.number().int(),
});
const Replied = z.union([z.object({ ok: z.literal(true), sent: z.boolean() }), z.object({ ok: z.literal(false), error: z.string() })]);

export type ReplyInput = { messageId: string; body: string; /** Only the preview's Send button sets this. */ send: boolean };
export type DraftInput = { to: string; subject: string; body: string };

/** Where mail comes from and where a reply goes: Apple Mail on this Mac, or a fake in tests. */
export type MailSource = {
  candidates(): Promise<Outcome<Candidate[]>>;
  /** Show the message in Mail. */
  open(messageId: string): Promise<Outcome<true>>;
  reply(input: ReplyInput): Promise<Outcome<{ sent: boolean }>>;
  /** Open a new, filled-in draft in Mail. Never sends. */
  draft(input: DraftInput): Promise<Outcome<true>>;
};

const fail = (code: string, message: string): Outcome<never> => ({ ok: false, error: { code, message } });

/** Mail's `message id` is the Message-ID header; `message://` links want it in angle brackets, URL-encoded. */
export function messageUrl(messageId: string): string {
  const bare = messageId.trim().replace(/^<|>$/g, "");
  return `message://${encodeURIComponent(`<${bare}>`)}`;
}

/** Apple Mail through osascript. Reading never changes anything; a reply is only sent with send=true. */
export function appleMail(jxa: JxaRunner, run: RunCommand): MailSource {
  return {
    async candidates() {
      const result = await jxa(LIST_UNREAD, { days: LOOK_BACK_DAYS, limit: MAX_CANDIDATES, previewChars: PREVIEW_CHARS });
      if (!result.ok) return result;
      const parsed = Listed.safeParse(result.value);
      if (!parsed.success) return fail("mail_failed", "Mail answered in a way Heel couldn't read.");
      return { ok: true, value: parsed.data.items.map((m) => ({ id: m.id, from: m.from, subject: m.subject, date: m.date, snippet: m.preview })) };
    },

    async open(messageId) {
      const result = await run("/usr/bin/open", [messageUrl(messageId)], { timeoutMs: 10_000 });
      return result.ok ? { ok: true, value: true } : fail("open_failed", "Couldn't open that message in Mail.");
    },

    async reply(input) {
      const result = await jxa(REPLY, { id: input.messageId.trim().replace(/^<|>$/g, ""), body: input.body, send: input.send });
      if (!result.ok) return result;
      const parsed = Replied.safeParse(result.value);
      if (!parsed.success) return fail("mail_failed", "Mail answered in a way Heel couldn't read.");
      if (!parsed.data.ok) return fail("not_found", "That email isn't in your inbox any more.");
      return { ok: true, value: { sent: parsed.data.sent } };
    },

    async draft(input) {
      const result = await jxa(NEW_DRAFT, input);
      return result.ok ? { ok: true, value: true } : result;
    },
  };
}

/** For tests: a fixed inbox, and a record of every reply asked for. */
export function fakeMail(items: Candidate[] = []): MailSource & { replies: ReplyInput[]; opened: string[]; drafts: DraftInput[] } {
  const replies: ReplyInput[] = [];
  const opened: string[] = [];
  const drafts: DraftInput[] = [];
  return {
    replies,
    opened,
    drafts,
    draft: async (input) => (drafts.push(input), { ok: true, value: true }),
    candidates: async () => ({ ok: true, value: items }),
    open: async (id) => (opened.push(id), { ok: true, value: true }),
    reply: async (input) => {
      if (!items.some((i) => i.id === input.messageId)) return fail("not_found", "That email isn't in your inbox any more.");
      replies.push(input);
      return { ok: true, value: { sent: input.send } };
    },
  };
}
