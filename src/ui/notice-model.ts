import { z } from "zod";

export type NoticeTone = "info" | "error";

/** One transient message: what just happened, with Undo when it can be undone. */
export type Notice = {
  message: string;
  tone: NoticeTone;
  undo?: () => void;
  /** About the running time-box, so it may still show next to Greg during one. */
  aboutFocus?: boolean;
  /** Up to three ways to answer (a nudge); shown instead of Undo. */
  choices?: readonly { label: string; run: () => void }[];
};

/** The notice on screen: numbered so a repeat of the same words still re-animates, counting how many it replaced. */
export type ShownNotice = Notice & { id: number; count: number };

export type NoticeRoute = "panel" | "bubble" | "silent";
export type NoticeContext = { panelVisible: boolean; quiet: boolean; focusRunning: boolean };

/** How long a notice stays (longer while hovered or focused). */
export const NOTICE_MS = 8_000;

/**
 * Where a notice goes: the panel's toast while the panel is open; a bubble next to Greg when it is closed,
 * unless Greg is in Quiet mode or a time-box is running (a notice about that time-box still shows).
 */
export function routeNotice(notice: Pick<Notice, "aboutFocus">, context: NoticeContext): NoticeRoute {
  if (context.panelVisible) return "panel";
  if (context.quiet) return "silent";
  if (context.focusRunning && !notice.aboutFocus) return "silent";
  return "bubble";
}

/** One toast at a time: a new notice replaces the one showing and says how many it stands for. */
export function replaceNotice(current: ShownNotice | null, next: Notice, id: number): ShownNotice {
  return { ...next, id, count: current ? current.count + 1 : 1 };
}

/** What the shell carries to the notice window (functions can't cross; Undo goes back by id). */
export const BubblePayloadSchema = z.object({ id: z.number().int(), message: z.string(), tone: z.enum(["info", "error"]), undoable: z.boolean(), choices: z.array(z.string()).default([]) });
export type BubblePayload = z.output<typeof BubblePayloadSchema>;
/** Undo, or the index of the choice taken. */
export const UndoPayloadSchema = z.object({ id: z.number().int(), choice: z.number().int().min(0).optional() });

export function toBubble(notice: ShownNotice): BubblePayload {
  return { id: notice.id, message: notice.message, tone: notice.tone, undoable: notice.undo !== undefined, choices: (notice.choices ?? []).map((c) => c.label) };
}
