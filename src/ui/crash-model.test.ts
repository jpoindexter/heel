import { describe, expect, it } from "vitest";
import { backgroundFailureNotice, crashLine, isBenignBackgroundError } from "./crash-model";
import { ErrorBoundary } from "./ErrorBoundary";

describe("crashLine", () => {
  it("keeps the message of an Error, a string as is, and names the empty case", () => {
    expect(crashLine(new Error("thread  entry\nhad no role"))).toBe("thread entry had no role");
    expect(crashLine("boom")).toBe("boom");
    expect(crashLine(undefined)).toBe("an error with no message");
    expect(crashLine({ anything: 1 })).toBe("an error with no message");
  });

  it("never runs long", () => {
    expect(crashLine("x".repeat(500))).toHaveLength(200);
  });
});

describe("ErrorBoundary", () => {
  it("turns a thrown render error into recovery state, never a blank root", () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error("Reply exploded"))).toEqual({ crashed: "Reply exploded" });
  });

  it("lets the browser's ResizeObserver housekeeping pass without a toast, and nothing else", () => {
    expect(isBenignBackgroundError("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(isBenignBackgroundError(new Error("ResizeObserver loop limit exceeded"))).toBe(true);
    expect(isBenignBackgroundError(new Error("fetch failed"))).toBe(false);
  });

  it("words a background failure as a toast", () => {
    expect(backgroundFailureNotice(new Error("fetch failed"))).toBe("Something failed in the background: fetch failed");
  });
});
