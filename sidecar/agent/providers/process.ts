import { spawn, type ChildProcess } from "node:child_process";

const MAX_STDOUT_CHARS = 256_000;
const MAX_STDERR_CHARS = 64_000;
const KILL_GRACE_MS = 2_000;

export type RunOptions = { input?: string; timeoutMs: number; cwd?: string; signal?: AbortSignal };

export type RunResult =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; kind: "spawn" | "timeout" | "exit" | "aborted"; message: string; stdout: string; stderr: string };

export type RunCommand = (executable: string, args: readonly string[], options: RunOptions) => Promise<RunResult>;

function appendBounded(current: string, chunk: Buffer, limit: number): string {
  const next = current + chunk.toString("utf8");
  return next.length > limit ? next.slice(0, limit) : next;
}

function lastLine(text: string): string {
  return text.trim().split("\n").at(-1) ?? "";
}

/** Ends the child when time runs out or the caller aborts, and remembers which of the two it was. */
function guard(child: ChildProcess, options: RunOptions) {
  const why = { timedOut: false, aborted: false };
  let killer: NodeJS.Timeout | undefined;
  const stop = () => {
    child.kill("SIGTERM");
    killer = setTimeout(() => child.kill("SIGKILL"), KILL_GRACE_MS);
  };
  const timer = setTimeout(() => {
    why.timedOut = true;
    stop();
  }, options.timeoutMs);
  const onAbort = () => {
    why.aborted = true;
    stop();
  };
  if (options.signal?.aborted) onAbort();
  else options.signal?.addEventListener("abort", onAbort, { once: true });
  const clear = () => {
    clearTimeout(timer);
    if (killer) clearTimeout(killer);
    options.signal?.removeEventListener("abort", onAbort);
  };
  return { why, clear };
}

/** Run a program without a shell, with a hard timeout and bounded output. Never throws. */
export const runCommand: RunCommand = (executable, args, options) =>
  new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const child = spawn(executable, [...args], { cwd: options.cwd, shell: false, stdio: ["pipe", "pipe", "pipe"] });
    const { why, clear } = guard(child, options);

    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clear();
      resolve(result);
    };

    child.stdout.on("data", (chunk: Buffer) => (stdout = appendBounded(stdout, chunk, MAX_STDOUT_CHARS)));
    child.stderr.on("data", (chunk: Buffer) => (stderr = appendBounded(stderr, chunk, MAX_STDERR_CHARS)));
    child.stdin.on("error", () => undefined); // the child may exit before reading its input

    child.on("error", (error) =>
      finish({ ok: false, kind: "spawn", message: `Couldn't start ${executable}: ${error.message}`, stdout, stderr }),
    );
    child.on("close", (code, signal) => {
      if (why.aborted) return finish({ ok: false, kind: "aborted", message: "Stopped.", stdout, stderr });
      if (why.timedOut) {
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
