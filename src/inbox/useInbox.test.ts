import { describe, expect, it } from "vitest";
import type { InboxStatusDto } from "../../shared/api";
import { watchOver } from "./useInbox";

const status = (extra: Partial<InboxStatusDto> = {}) => ({ ok: true as const, data: { configured: true, connected: false, account: null, problem: null, ...extra } });
const offline = { ok: false as const, error: { code: "offline", message: "Not running." } };

describe("watchOver", () => {
  it("keeps waiting while Google has not sent the person back", () => {
    expect(watchOver(status(), 10_000)).toBe(false);
    expect(watchOver(offline, 10_000)).toBe(false);
  });
  it("stops on success or on a problem", () => {
    expect(watchOver(status({ connected: true, account: "a@b.c" }), 10_000)).toBe(true);
    expect(watchOver(status({ problem: "Google said no." }), 10_000)).toBe(true);
  });
  it("gives up after five minutes, even with no answer", () => {
    expect(watchOver(offline, 5 * 60 * 1000 + 1)).toBe(true);
  });
});
