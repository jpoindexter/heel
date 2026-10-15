import { describe, expect, it } from "vitest";
import { claudeProvider } from "./claude";
import { codexProvider } from "./codex";
import { EXIT, OK, fakeDeps } from "./test-deps";

const REQUEST = { system: "SYSTEM", prompt: "PROMPT", model: null };

describe("claude provider", () => {
  it("says so when the CLI is not installed", async () => {
    const status = await claudeProvider(fakeDeps({ found: false })).status();
    expect(status).toMatchObject({ installed: false, ready: false, detail: "Claude CLI isn't installed." });
  });

  it("is ready when signed in and names the subscription", async () => {
    const deps = fakeDeps({ answers: { auth: OK('{"loggedIn":true,"subscriptionType":"Max"}') } });
    expect(await claudeProvider(deps).status()).toMatchObject({ ready: true, detail: "Max subscription" });
  });

  it("is not ready when signed out, even if the CLI exits non-zero", async () => {
    const signedOut = { ...EXIT("not logged in"), stdout: '{"loggedIn":false}' };
    const status = await claudeProvider(fakeDeps({ answers: { auth: signedOut } })).status();
    expect(status).toMatchObject({ installed: true, ready: false });
    expect(status.detail).toContain("claude auth login");
  });

  it("sends the system prompt as a flag and the prompt on stdin, with tools off", async () => {
    const deps = fakeDeps({ answers: { "-p": OK("answer") } });
    const result = await claudeProvider(deps).complete({ ...REQUEST, model: "sonnet" });
    expect(result).toEqual({ ok: true, value: "answer" });
    const call = deps.calls[0]!;
    expect(call.options.input).toBe("PROMPT");
    expect(call.options.cwd).toBe("/fake/workdir");
    expect(call.args).toEqual(
      expect.arrayContaining(["-p", "--safe-mode", "--tools", "", "--no-session-persistence", "--system-prompt", "SYSTEM", "--model", "sonnet"]),
    );
  });

  it("omits --model when none is chosen", async () => {
    const deps = fakeDeps({ answers: { "-p": OK("answer") } });
    await claudeProvider(deps).complete(REQUEST);
    expect(deps.calls[0]!.args).not.toContain("--model");
  });

  it("maps a timeout, a sign-in failure, and an empty answer to distinct errors", async () => {
    const timeout = fakeDeps({ answers: { "-p": { ok: false, kind: "timeout", message: "t", stdout: "", stderr: "" } } });
    expect(await claudeProvider(timeout).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "timeout" } });

    const signedOut = fakeDeps({ answers: { "-p": EXIT("failed", "Please run /login") } });
    expect(await claudeProvider(signedOut).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "not_signed_in" } });

    const empty = fakeDeps({ answers: { "-p": OK("") } });
    expect(await claudeProvider(empty).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "empty" } });
  });

  it("fails with not_installed when the CLI vanishes", async () => {
    expect(await claudeProvider(fakeDeps({ found: false })).complete(REQUEST)).toMatchObject({
      ok: false,
      error: { code: "not_installed" },
    });
  });
});

describe("codex provider", () => {
  it("is ready when logged in with ChatGPT", async () => {
    const deps = fakeDeps({ answers: { login: OK("Logged in using ChatGPT") } });
    expect(await codexProvider(deps).status()).toMatchObject({ ready: true, detail: "ChatGPT subscription" });
  });

  it("is not ready when not logged in", async () => {
    const deps = fakeDeps({ answers: { login: EXIT("Not logged in") } });
    const status = await codexProvider(deps).status();
    expect(status.ready).toBe(false);
    expect(status.detail).toContain("codex login");
  });

  it("runs read-only and ephemeral with the system text leading the prompt on stdin", async () => {
    const deps = fakeDeps({ answers: { exec: OK("answer") } });
    const result = await codexProvider(deps).complete({ ...REQUEST, model: "some-model" });
    expect(result).toEqual({ ok: true, value: "answer" });
    const call = deps.calls[0]!;
    expect(call.args[0]).toBe("exec");
    expect(call.args).toEqual(expect.arrayContaining(["--ephemeral", "--ignore-user-config", "--ignore-rules", "--sandbox", "read-only", "-m", "some-model"]));
    expect(call.args.at(-1)).toBe("-");
    expect(call.options.input).toBe("SYSTEM\n\n---\n\nPROMPT");
  });

  it("maps failures to actionable errors", async () => {
    const failed = fakeDeps({ answers: { exec: EXIT("stream disconnected", "stream disconnected") } });
    expect(await codexProvider(failed).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "failed" } });
    const empty = fakeDeps({ answers: { exec: OK("") } });
    expect(await codexProvider(empty).complete(REQUEST)).toMatchObject({ ok: false, error: { code: "empty" } });
  });
});
