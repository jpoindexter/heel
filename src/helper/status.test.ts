import { describe, expect, it } from "vitest";
import { helperNotice, statusFromPayload } from "./status";

describe("statusFromPayload", () => {
  it("accepts the four states", () => {
    expect(statusFromPayload({ state: "running", reason: null })).toEqual({ state: "running", reason: null });
    expect(statusFromPayload({ state: "stopped", reason: "Node 22 not found" })).toMatchObject({ state: "stopped" });
  });
  it("ignores anything else, so a bad message can't hide a real problem or invent one", () => {
    for (const bad of [null, "running", { state: "dead", reason: null }, { state: "running" }]) expect(statusFromPayload(bad)).toBeNull();
  });
});

describe("helperNotice", () => {
  it("says nothing when it runs", () => expect(helperNotice({ state: "running", reason: null })).toBeNull());
  it("explains starting and restarting without offering a button that can't help yet", () => {
    expect(helperNotice({ state: "starting", reason: null })).toMatchObject({ canRestart: false });
    expect(helperNotice({ state: "restarting", reason: null })).toMatchObject({ canRestart: false });
  });
  it("shows the plain-words reason and offers Restart when it has stopped", () => {
    expect(helperNotice({ state: "stopped", reason: "Heel needs Node 22 or newer." })).toEqual({ text: "Heel needs Node 22 or newer.", canRestart: true });
    expect(helperNotice({ state: "stopped", reason: null })).toEqual({ text: "Heel's helper isn't running.", canRestart: true });
  });
});
