import { mapRunFailure } from "./run-failure";
import {
  DEFAULT_COMPLETE_TIMEOUT_MS,
  STATUS_TIMEOUT_MS,
  failResult,
  okResult,
  type Provider,
  type ProviderDeps,
  type ProviderStatus,
} from "./types";

const ID = "codex" as const;
const LABEL = "Codex (subscription)";
const CLI = "The Codex CLI";

/** Codex through the user's own `codex login`. Runs read-only, ephemeral, with no user config or rules. */
export function codexProvider(deps: ProviderDeps): Provider {
  async function status(): Promise<ProviderStatus> {
    const base = { id: ID, label: LABEL };
    const executable = await deps.find("codex");
    if (!executable) return { ...base, installed: false, ready: false, detail: "Codex CLI isn't installed." };

    const run = await deps.run(executable, ["login", "status"], { timeoutMs: STATUS_TIMEOUT_MS, cwd: deps.workdir });
    const output = `${run.stdout}\n${run.stderr}`;
    if (!/Logged in using/i.test(output)) {
      return { ...base, installed: true, ready: false, detail: "Not signed in. Run codex login in a terminal." };
    }
    const detail = /ChatGPT/i.test(output) ? "ChatGPT subscription" : "Codex account";
    return { ...base, installed: true, ready: true, detail };
  }

  return {
    id: ID,
    label: LABEL,
    status,
    models: async () => okResult([]),
    async complete(request) {
      const executable = await deps.find("codex");
      if (!executable) return failResult("not_installed", "The Codex CLI isn't installed.");

      // `codex exec` has no system-prompt flag, so the instructions lead the prompt.
      const prompt = `${request.system}\n\n---\n\n${request.prompt}`;
      const args = [
        "exec",
        "--ephemeral",
        "--ignore-user-config",
        "--ignore-rules",
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        ...(request.model ? ["-m", request.model] : []),
        "-",
      ];
      const run = await deps.run(executable, args, {
        input: prompt,
        timeoutMs: request.timeoutMs ?? DEFAULT_COMPLETE_TIMEOUT_MS,
        cwd: deps.workdir,
      });
      if (!run.ok) return mapRunFailure(run, CLI, "codex login");
      return run.stdout ? okResult(run.stdout) : failResult("empty", "Codex returned an empty answer. Try again.");
    },
  };
}
