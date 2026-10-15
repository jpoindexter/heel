import type { RunCommand } from "../agent/providers/process";
import type { Outcome } from "../inbox/service";

/** Scripts take one JSON argument and print one JSON line. */
export type JxaRunner = (script: string, input: unknown) => Promise<Outcome<unknown>>;

const OSASCRIPT = "/usr/bin/osascript";
/** Mail can be slow to answer on a big inbox; a reply is a few seconds. */
const TIMEOUT_MS = 45_000;

/** macOS says this when the person has not allowed Heel to control Mail (Automation permission), or said no. */
const NOT_ALLOWED = /-1743|not authori[sz]ed to send apple events|not permitted/i;

const fail = (code: string, message: string): Outcome<never> => ({ ok: false, error: { code, message } });

/** What macOS or Mail said, as one sentence the person can act on. */
export function explainJxaFailure(stderr: string, kind: string): { code: string; message: string } {
  if (NOT_ALLOWED.test(stderr)) {
    return { code: "not_allowed", message: "macOS hasn't allowed Heel to talk to Mail. System Settings › Privacy & Security › Automation › Heel › Mail, then try again." };
  }
  if (kind === "timeout") return { code: "timeout", message: "Mail took too long to answer. Open Mail, let it finish syncing, then try again." };
  const line = stderr.trim().split("\n").at(-1) ?? "";
  return { code: "mail_failed", message: line ? `Mail said: ${line}` : "Mail didn't answer." };
}

/** Run a JXA script in osascript with the input as its one argument (never through a shell). */
export function osascriptJxa(run: RunCommand): JxaRunner {
  return async (script, input) => {
    const result = await run(OSASCRIPT, ["-l", "JavaScript", "-e", script, "--", JSON.stringify(input)], { timeoutMs: TIMEOUT_MS });
    if (!result.ok) return fail(explainJxaFailure(result.stderr, result.kind).code, explainJxaFailure(result.stderr, result.kind).message);
    try {
      return { ok: true, value: JSON.parse(result.stdout.trim()) };
    } catch {
      return fail("mail_failed", "Mail answered in a way Heel couldn't read.");
    }
  };
}
