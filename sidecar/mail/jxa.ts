import type { RunCommand } from "../agent/providers/process";
import type { Outcome } from "../inbox/service";

/** Scripts take one JSON argument and print one JSON line. */
export type JxaRunner = (script: string, input: unknown) => Promise<Outcome<unknown>>;

const OSASCRIPT = "/usr/bin/osascript";
/** Mail can be slow to answer on a big inbox; a reply is a few seconds. */
const TIMEOUT_MS = 45_000;
/** Calendar evaluates a date query one event at a time: 7 days over a 1,400-event calendar took 35–95 s here. shortcut: JXA is the ceiling; move to EventKit (Swift helper + calendar permission) when the wait hurts. */
export const CALENDAR_TIMEOUT_MS = 150_000;

/** macOS says this when the person has not allowed Heel to control Mail (Automation permission), or said no. */
const NOT_ALLOWED = /-1743|not authori[sz]ed to send apple events|not permitted/i;

const fail = (code: string, message: string): Outcome<never> => ({ ok: false, error: { code, message } });

/** What macOS or Mail said, as one sentence the person can act on. */
export function explainJxaFailure(stderr: string, kind: string, app = "Mail"): { code: string; message: string } {
  if (NOT_ALLOWED.test(stderr)) {
    return { code: "not_allowed", message: `macOS hasn't allowed Heel to talk to ${app}. System Settings › Privacy & Security › Automation › Heel › ${app}, then try again.` };
  }
  if (kind === "timeout") return { code: "timeout", message: `${app} took too long to answer. Open ${app}, let it finish syncing, then try again.` };
  const line = stderr.trim().split("\n").at(-1) ?? "";
  return { code: "mail_failed", message: line ? `${app} said: ${line}` : `${app} didn't answer.` };
}

/** Run a JXA script in osascript with the input as its one argument (never through a shell). `app` names who is asked, for the failure sentence. */
export function osascriptJxa(run: RunCommand, app = "Mail", timeoutMs = TIMEOUT_MS): JxaRunner {
  return async (script, input) => {
    const result = await run(OSASCRIPT, ["-l", "JavaScript", "-e", script, "--", JSON.stringify(input)], { timeoutMs });
    if (!result.ok) { const why = explainJxaFailure(result.stderr, result.kind, app); return fail(why.code, why.message); }
    try {
      return { ok: true, value: JSON.parse(result.stdout.trim()) };
    } catch {
      return fail("mail_failed", "Mail answered in a way Heel couldn't read.");
    }
  };
}
