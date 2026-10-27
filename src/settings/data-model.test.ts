import { describe, expect, it } from "vitest";
import { confirmsWipe, formatBytes, wipeLines } from "./data-model";
import { gregSummary, lookSummary, workSummary } from "./settings-model";

describe("wipe preview", () => {
  it("names real counts, every file with its size, and what stays", () => {
    const lines = wipeLines({ dataDir: "/d", retentionDays: 30, counts: { tasks: 12, parked: 1, messages: 0, documents: 2, skills: 1 }, files: [{ name: "heel.db", bytes: 81920 }, { name: "documents", bytes: 2_200_000 }] });
    expect(lines[0]).toBe("Deletes 12 tasks (done ones too), 1 parked idea, 0 messages, 2 documents, 1 skill of yours.");
    expect(wipeLines({ dataDir: "/d", retentionDays: 30, counts: { tasks: 0, parked: 0, messages: 0, documents: 0, skills: 2 }, files: [] })[0]).toContain("2 skills of yours");
    expect(lines[1]).toBe("Removes from the data folder: heel.db (80 KB), documents (2.1 MB).");
    expect(lines[2]).toContain("Disconnects Gmail");
    expect(lines[3]).toContain("cannot be undone");
    expect(formatBytes(12)).toBe("12 B");
  });

  it("accepts the phrase exactly, with spaces forgiven and capitals not", () => {
    expect(confirmsWipe("wipe everything")).toBe(true);
    expect(confirmsWipe("  wipe everything ")).toBe(true);
    expect(confirmsWipe("Wipe everything")).toBe(false);
    expect(confirmsWipe("wipe")).toBe(false);
  });
});

describe("group summaries", () => {
  it("say the current values in the control's own words", () => {
    expect(lookSummary("system", "compact")).toBe("System · Compact");
    expect(gregSummary("calm", true, false)).toBe("Calm · notices on · attention off");
    expect(workSummary({ timer: "timebox", structure: "none", sizing: "none" })).toBe("Time-box");
    expect(workSummary({ timer: "pomodoro", structure: "pickle-jar", sizing: "tshirt" })).toBe("Pomodoro · Pickle jar · T-shirt");
  });
});
