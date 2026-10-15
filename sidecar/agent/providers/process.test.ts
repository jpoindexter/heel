import { describe, expect, it } from "vitest";
import { runCommand } from "./process";

const node = (script: string, extra: { input?: string; timeoutMs?: number } = {}) =>
  runCommand(process.execPath, ["-e", script], { timeoutMs: extra.timeoutMs ?? 10_000, input: extra.input });

describe("runCommand", () => {
  it("returns trimmed stdout on success", async () => {
    expect(await node("process.stdout.write('hi\\n')")).toEqual({ ok: true, stdout: "hi", stderr: "" });
  });

  it("passes input on stdin", async () => {
    const result = await node("process.stdin.pipe(process.stdout)", { input: "echo me" });
    expect(result).toMatchObject({ ok: true, stdout: "echo me" });
  });

  it("reports a non-zero exit with the last stderr line", async () => {
    const result = await node("console.error('first'); console.error('bad thing'); process.exit(3)");
    expect(result).toMatchObject({ ok: false, kind: "exit", message: "bad thing" });
  });

  it("kills a process that outlives the timeout and says so", async () => {
    const started = Date.now();
    const result = await node("setTimeout(() => {}, 20000)", { timeoutMs: 200 });
    expect(result).toMatchObject({ ok: false, kind: "timeout" });
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("kills a running process when the caller aborts, and says it was stopped", async () => {
    const stop = new AbortController();
    const started = Date.now();
    const running = runCommand(process.execPath, ["-e", "setTimeout(() => {}, 20000)"], { timeoutMs: 15_000, signal: stop.signal });
    setTimeout(() => stop.abort(), 150);
    expect(await running).toMatchObject({ ok: false, kind: "aborted" });
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("does not start work that was already stopped", async () => {
    const result = await runCommand(process.execPath, ["-e", "setTimeout(() => {}, 20000)"], { timeoutMs: 15_000, signal: AbortSignal.abort() });
    expect(result).toMatchObject({ ok: false, kind: "aborted" });
  });

  it("reports a program that cannot start", async () => {
    const result = await runCommand("/nonexistent/heel-test", [], { timeoutMs: 1_000 });
    expect(result).toMatchObject({ ok: false, kind: "spawn" });
  });

  it("caps runaway output", async () => {
    const result = await node("process.stdout.write('x'.repeat(400000))");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.stdout.length).toBeLessThanOrEqual(256_000);
  });
});
