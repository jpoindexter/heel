import { describe, expect, it } from "vitest";
import type { RunCommand, RunResult } from "../agent/providers/process";
import { explainJxaFailure, osascriptJxa } from "./jxa";

const runner = (result: RunResult, seen: { args: readonly string[] }[] = []): RunCommand => async (_exe, args) => (seen.push({ args }), result);

describe("osascriptJxa", () => {
  it("passes the script and the JSON input as arguments, never through a shell, and parses the JSON line back", async () => {
    const seen: { args: readonly string[] }[] = [];
    const jxa = osascriptJxa(runner({ ok: true, stdout: '{"items":[]}\n', stderr: "" }, seen));
    expect(await jxa("function run(a){}", { days: 7 })).toEqual({ ok: true, value: { items: [] } });
    expect(seen[0]!.args).toEqual(["-l", "JavaScript", "-e", "function run(a){}", "--", '{"days":7}']);
  });

  it("turns the macOS Automation refusal into a sentence that says where to allow it", async () => {
    const jxa = osascriptJxa(runner({ ok: false, kind: "exit", message: "exit 1", stdout: "", stderr: "execution error: Not authorized to send Apple events to Mail. (-1743)" }));
    const result = await jxa("x", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not_allowed");
      expect(result.error.message).toContain("Automation");
    }
  });

  it("explains a timeout and a plain failure without leaking a stack", () => {
    expect(explainJxaFailure("", "timeout").code).toBe("timeout");
    expect(explainJxaFailure("line one\nMail got an error: boom", "exit")).toEqual({ code: "mail_failed", message: "Mail said: Mail got an error: boom" });
  });

  it("rejects output that is not JSON", async () => {
    const jxa = osascriptJxa(runner({ ok: true, stdout: "not json", stderr: "" }));
    expect((await jxa("x", {})).ok).toBe(false);
  });
});
