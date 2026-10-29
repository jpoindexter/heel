const MAX_LINE = 200;

/** The one calm line the person reads first. Not their fault, nothing lost. */
export const CRASH_MESSAGE = "Something in Heel broke. Nothing you did; your tasks are safe.";

/** Whatever was thrown, as one short line for the screen and the log (never a stack, never undefined). */
export function crashLine(error: unknown): string {
  const text = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const line = text.replace(/\s+/g, " ").trim();
  return (line || "an error with no message").slice(0, MAX_LINE);
}

/** Browser housekeeping that arrives as a window "error" with nothing failed: layout settling over two frames under a popover. */
const BENIGN = [/^ResizeObserver loop/];

export const isBenignBackgroundError = (reason: unknown): boolean => BENIGN.some((pattern) => pattern.test(crashLine(reason)));

/** What a failed promise or an uncaught error in the background should say in a toast. */
export function backgroundFailureNotice(reason: unknown): string {
  return `Something failed in the background: ${crashLine(reason)}`;
}
