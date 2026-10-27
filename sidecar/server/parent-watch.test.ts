import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchParent } from "./parent-watch";

describe("watchParent", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires once when the parent pid changes, and not while it stays", () => {
    let ppid = 500;
    const onGone = vi.fn();
    watchParent({ parentPid: 500, ppid: () => ppid, onGone, everyMs: 100 });
    vi.advanceTimersByTime(350);
    expect(onGone).not.toHaveBeenCalled();
    ppid = 1;
    vi.advanceTimersByTime(100);
    expect(onGone).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    expect(onGone).toHaveBeenCalledTimes(1);
  });

  it("stops polling when told to", () => {
    let ppid = 500;
    const onGone = vi.fn();
    const stop = watchParent({ parentPid: 500, ppid: () => ppid, onGone, everyMs: 100 });
    stop();
    ppid = 1;
    vi.advanceTimersByTime(1_000);
    expect(onGone).not.toHaveBeenCalled();
  });
});
