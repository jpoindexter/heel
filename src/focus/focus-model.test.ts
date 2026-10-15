import { describe, expect, it } from "vitest";
import { checkInQuestion, msUntilDue, planFor } from "./focus-model";

const session = { goal: "Write the intro", taskId: "t1", realisticMin: 25, worstMin: 38, startedAt: 1_000_000 };

describe("checkInQuestion", () => {
  it("quotes the goal exactly as it was stated", () => {
    expect(checkInQuestion("Fix the “login” bug (again)")).toBe("Where are you vs “Fix the “login” bug (again)”?");
  });
});

describe("planFor", () => {
  it("keep going: ends this box as continued and starts one for the gap to the worst case", () => {
    expect(planFor("keep_going", session)).toEqual({ outcome: "continued", next: { goal: "Write the intro", realisticMin: 13 }, completesTask: false });
  });

  it("park and return: a short box on the same goal", () => {
    expect(planFor("park_and_return", session)).toEqual({ outcome: "parked_and_returned", next: { goal: "Write the intro", realisticMin: 10 }, completesTask: false });
  });

  it("done: no next box, and the task is done too when there is one", () => {
    expect(planFor("done", session)).toEqual({ outcome: "done", next: null, completesTask: true });
    expect(planFor("done", { ...session, taskId: null }).completesTask).toBe(false);
  });
});

describe("msUntilDue", () => {
  it("counts down to the realistic end and stops at zero", () => {
    expect(msUntilDue(session, 1_000_000)).toBe(25 * 60_000);
    expect(msUntilDue(session, 1_000_000 + 30 * 60_000)).toBe(0);
  });
});
