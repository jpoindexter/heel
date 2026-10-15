import { spawn } from "node:child_process";

const MAX_STDOUT_CHARS = 256_000;
const MAX_STDERR_CHARS = 64_000;
const KILL_GRACE_MS = 2_000;

export type RunOptions = { input?: string; timeoutMs: number; cwd?: string };

export type RunResult =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; kind: "spawn" | "timeout" | "exit"; message: string; stdout: string; stderr: string };

export type RunCommand = (executable: string, args: readonly string[], options: RunOptions) => Promise<RunResult>;

function appendBounded(current: string, chunk: Buffer, limit: number): string {
  const next = current + chunk.toString("utf8");
  return next.length > limit ? next.slice(0, limit) : next;
}

function lastLine(text: string): string {
  return text.trim().split("\n").at(-1) ?? "";
}

/** Run a program without a shell, with a hard timeout and bounded output. Never throws. */
export const runCommand: RunCommand = (executable, args, options) =>
  new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    let killer: NodeJS.Timeout | undefined;

    const child = spawn(executable, [...args], { cwd: options.cwd, shell: false, stdio: ["pipe", "pipe", "pipe"] });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      killer = setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MS);
    }, options.timeoutMs);

    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (killer) clearTimeout(killer);
      resolve(result);
    };

    child.stdout.on("data", (chunk: Buffer) => (stdout = appendBounded(stdout, chunk, MAX_STDOUT_CHARS)));
    child.stderr.on("data", (chunk: Buffer) => (stderr = appendBounded(stderr, chunk, MAX_STDERR_CHARS)));
    child.stdin.on("error", () => undefined); // the child may exit before reading its input

    child.on("error", (error) =>
      finish({ ok: false, kind: "spawn", message: `Couldn't start ${executable}: ${error.message}`, stdout, stderr }),
    );
    child.on("close", (code, signal) => {
      if (timedOut) {
        return finish({ ok: false, kind: "timeout", message: `Timed out after ${options.timeoutMs} ms.`, stdout, stderr });
      }
      if (code !== 0) {
        const message = lastLine(stderr) || `Exited with ${code === null ? `signal ${signal}` : `code ${code}`}.`;
        return finish({ ok: false, kind: "exit", message, stdout, stderr });
      }
      finish({ ok: true, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    child.stdin.end(options.input);
  });
