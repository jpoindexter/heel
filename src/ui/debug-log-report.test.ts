import { describe, expect, it } from "vitest";
import type { DebugInfoDto } from "../../shared/api";
import { APP_VERSION } from "../../shared/version";
import { buildReport } from "./debug-log-report";

const helper: DebugInfoDto = {
  version: APP_VERSION,
  os: "macOS (Darwin 25.6.0)",
  node: "v22.12.0",
  port: 51234,
  uptimeSec: 3_725,
  dataDir: "/Users/me/Library/Application Support/studio.theft.heel",
  migration: 9,
  provider: "claude",
  attention: false,
  counts: { tasks: 3, parked: 1, documents: 2 },
  sidecarLog: ["Heel sidecar listening on 127.0.0.1:51234"],
};
const now = new Date("2026-10-27T09:00:00.000Z");

describe("buildReport", () => {
  it("starts with the header line and has every section in order", () => {
    const text = buildReport({ helper, log: [{ at: now.getTime(), level: "error", where: "panel", text: "render crashed: boom" }], now });
    expect(text.split("\n")[0]).toBe(`Heel ${APP_VERSION} · macOS (Darwin 25.6.0) · 2026-10-27T09:00:00.000Z`);
    const order = ["HELPER", "port: 51234", "up: 1 h 2 min", "brain: claude", "tasks: 3 · parked: 1 · documents: 2", "PANEL LOG", "render crashed: boom", "HELPER LOG", "listening on"];
    const positions = order.map((part) => text.indexOf(part));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(text).not.toContain("CRASH");
  });

  it("puts the crash first when there is one, and says plainly when the helper was not reached", () => {
    const text = buildReport({ helper: null, log: [], crash: "Reply exploded", now });
    expect(text.indexOf("CRASH\nReply exploded")).toBeLessThan(text.indexOf("HELPER"));
    expect(text).toContain("not reached");
    expect(text).toContain("PANEL LOG (newest last)\n(empty)");
    expect(text).toContain("(helper not reached)");
  });
});
