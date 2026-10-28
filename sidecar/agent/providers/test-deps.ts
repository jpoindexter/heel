import { memorySecrets } from "../../inbox/keychain";
import type { RunCommand, RunOptions, RunResult } from "./process";
import type { ProviderDeps } from "./types";

export type RunCall = { executable: string; args: readonly string[]; options: RunOptions };

export type FakeDeps = ProviderDeps & { calls: RunCall[] };

type Overrides = {
  /** Answer for each run() call, by the first CLI argument (e.g. "auth", "exec", "-p"). */
  answers?: Record<string, RunResult>;
  found?: boolean;
  fetch?: typeof fetch;
  /** Keys already in the (fake) Keychain, by secret name. */
  secrets?: Record<string, string>;
};

export const OK = (stdout: string): RunResult => ({ ok: true, stdout, stderr: "" });
export const EXIT = (message: string, stderr = message): RunResult => ({ ok: false, kind: "exit", message, stdout: "", stderr });

/** Provider dependencies that never touch the real machine. */
export function fakeDeps(overrides: Overrides = {}): FakeDeps {
  const calls: RunCall[] = [];
  const run: RunCommand = async (executable, args, options) => {
    calls.push({ executable, args, options });
    return overrides.answers?.[args[0] ?? ""] ?? OK("");
  };
  return {
    calls,
    run,
    find: async (name) => (overrides.found === false ? undefined : `/fake/bin/${name}`),
    fetch: overrides.fetch ?? (async () => new Response("{}", { status: 200 })),
    workdir: "/fake/workdir",
    ollamaUrl: "http://127.0.0.1:11434",
    secrets: memorySecrets(overrides.secrets),
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
