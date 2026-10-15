import { describe, expect, it } from "vitest";
import { instructionFromInput, recipientName, sentNotice } from "./reply-model";

describe("recipientName", () => {
  it("keeps the name and drops the address, quotes and spaces", () => {
    expect(recipientName("Aoi Tanaka <aoi@example.com>")).toBe("Aoi Tanaka");
    expect(recipientName('"Billing" <bill@x.com>')).toBe("Billing");
    expect(recipientName("bill@x.com")).toBe("bill@x.com");
  });

  it("names who the reply went to", () => {
    expect(sentNotice("Aoi <a@x>")).toBe("Sent to Aoi");
  });
});

describe("instructionFromInput", () => {
  it("tidies spaces and refuses an empty box", () => {
    expect(instructionFromInput("  yes   friday works ")).toBe("yes friday works");
    expect(instructionFromInput("   ")).toBeNull();
  });
});
