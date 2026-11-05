import { describe, expect, it } from "vitest";
import { FEEDBACK_TO, FeedbackMailInputSchema, isFeedbackKind, mailtoUrl } from "./feedback";

describe("mailtoUrl", () => {
  it("encodes subject and body, sends CRLF line breaks, and keeps the subject on one line", () => {
    const url = mailtoUrl(FEEDBACK_TO, { subject: "[Heel bug] Esc & close\nagain", body: "line one\nline two ?=&" });
    expect(url.startsWith("mailto:jason@theft.studio?subject=")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("subject")).toBe("[Heel bug] Esc & close again");
    expect(params.get("body")).toBe("line one\r\nline two ?=&");
  });
});

describe("FeedbackMailInputSchema", () => {
  it("refuses an empty subject or body", () => {
    expect(FeedbackMailInputSchema.safeParse({ subject: "  ", body: "x" }).success).toBe(false);
    expect(FeedbackMailInputSchema.safeParse({ subject: "x", body: "" }).success).toBe(false);
    expect(FeedbackMailInputSchema.safeParse({ subject: "x", body: "y" }).success).toBe(true);
  });

  it("knows its two kinds", () => {
    expect(isFeedbackKind("bug") && isFeedbackKind("idea")).toBe(true);
    expect(isFeedbackKind("praise")).toBe(false);
  });
});
