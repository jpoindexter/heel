import { describe, expect, it } from "vitest";
import { isFeedbackKind } from "./feedback";
import { FeedbackReportSchema } from "./reports";

describe("feedback contract", () => {
  it("supports bugs and ideas and rejects caller-selected recipients", () => {
    expect(isFeedbackKind("bug") && isFeedbackKind("idea")).toBe(true);
    expect(isFeedbackKind("praise")).toBe(false);
    expect(FeedbackReportSchema.safeParse({ id: crypto.randomUUID(), kind: "bug", title: "Report", what: "Something broke", more: "", diagnostics: null, to: "someone@example.test" }).success).toBe(false);
  });
});
