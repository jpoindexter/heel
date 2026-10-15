import { z } from "zod";
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

const AuthStatus = z.object({ loggedIn: z.boolean(), subscriptionType: z.string().optional() });

const ID = "claude" as const;
const LABEL = "Claude (subscription)";
const CLI = "The Claude CLI";

/** Claude through the user's own `claude` login. No API key is stored by Heel. */
export function claudeProvider(deps: ProviderDeps): Provider {
  async function status(): Promise<ProviderStatus> {
    const base = { id: ID, label: LABEL };
    const executable = await deps.find("claude");
    if (!executable) return { ...base, installed: false, ready: false, detail: "Claude CLI isn't installed." };

    // `auth status` can exit non-zero when signed out, so read stdout either way.
    const run = await deps.run(executable, ["auth", "status"], { timeoutMs: STATUS_TIMEOUT_MS, cwd: deps.workdir });
    const parsed = AuthStatus.safeParse(safeJson(run.stdout));
    if (!parsed.success) {
      return { ...base, installed: true, ready: false, detail: "Couldn't check sign-in. Run claude auth status in a terminal." };
    }
    return parsed.data.loggedIn
      ? { ...base, installed: true, ready: true, detail: `${parsed.data.subscriptionType ?? "Claude"} subscription` }
      : { ...base, installed: true, ready: false, detail: "Not signed in. Run claude auth login in a terminal." };
  }

  return {
    id: ID,
    label: LABEL,
    status,
    // The CLI does not report a model list; an empty list means "default, or type a model name".
    models: async () => okResult([]),
    async complete(request) {
      const executable = await deps.find("claude");
      if (!executable) return failResult("not_installed", "The Claude CLI isn't installed.");

      const args = [
        "-p",
        "--safe-mode",
        "--tools",
        "",
        "--no-session-persistence",
        "--output-format",
        "text",
        "--system-prompt",
        request.system,
        ...(request.model ? ["--model", request.model] : []),
      ];
      const run = await deps.run(executable, args, {
        input: request.prompt,
        timeoutMs: request.timeoutMs ?? DEFAULT_COMPLETE_TIMEOUT_MS,
        cwd: deps.workdir,
        signal: request.signal,
      });
      if (!run.ok) return mapRunFailure(run, CLI, "claude auth login");
      return run.stdout ? okResult(run.stdout) : failResult("empty", "Claude returned an empty answer. Try again.");
    },
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
