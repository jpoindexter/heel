import { describe, expect, it } from "vitest";
import { dayLabel, doneTodayLine, weekdayLetter } from "./history-labels";

describe("dayLabel", () => {
  it("says Today, Yesterday, then the weekday and date", () => {
    expect(dayLabel("2026-10-15", "2026-10-15")).toBe("Today");
    expect(dayLabel("2026-10-14", "2026-10-15")).toBe("Yesterday");
    expect(dayLabel("2026-10-13", "2026-10-15")).toBe("Tue 13 Oct");
  });
});

describe("weekdayLetter", () => {
  it("is one letter per day", () => {
    expect(["2026-10-12", "2026-10-13", "2026-10-18"].map(weekdayLetter)).toEqual(["M", "T", "S"]);
  });
});

describe("doneTodayLine", () => {
  it("counts plainly", () => {
    expect([0, 1, 3].map(doneTodayLine)).toEqual(["Nothing done yet today", "1 done today", "3 done today"]);
  });
});
