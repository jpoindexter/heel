import type { RunResult } from "./process";
import { failResult, type ProviderResult } from "./types";

const SIGN_IN_HINT = /log ?in|sign ?in|auth|unauthori[sz]ed|credential|api key/i;

/** Turn a failed process run into a provider error a person can act on. */
export function mapRunFailure(
  result: Extract<RunResult, { ok: false }>,
  cli: string,
  signInCommand: string,
): ProviderResult<never> {
  if (result.kind === "timeout") {
    return failResult("timeout", `${cli} took too long to answer. Try again, or pick a different provider in Settings.`);
  }
  if (result.kind === "spawn") {
    return failResult("not_installed", `${cli} couldn't start. Check that it is installed.`);
  }
  if (SIGN_IN_HINT.test(`${result.message}\n${result.stderr}`)) {
    return failResult("not_signed_in", `${cli} isn't signed in. Run ${signInCommand} in a terminal, then try again.`);
  }
  return failResult("failed", `${cli} failed: ${result.message}`);
}
