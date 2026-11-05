import { describe, expect, it } from "vitest";
import { FEEDBACK_BODY_MAX_CHARS } from "../../shared/feedback";
import { REPORT_HEADING, TRIMMED_NOTE, feedbackMail, mailAsText } from "./feedback-mail";

const bug = { kind: "bug" as const, title: "Esc closes  two\nlayers", what: "Pressed Esc once in Settings.", more: "", report: "Heel 0.1.0 · macOS" };

describe("feedbackMail", () => {
  it("tags the subject with version and kind, on one line", () => {
    expect(feedbackMail(bug, "0.1.0").subject).toBe("[Heel 0.1.0 bug] Esc closes two layers");
    expect(feedbackMail({ ...bug, kind: "idea" }, "0.1.0").subject).toBe("[Heel 0.1.0 idea] Esc closes two layers");
  });

  it("writes short headed sections, skips an empty optional one, and puts the report last", () => {
    const { body } = feedbackMail({ ...bug, more: "Open Settings, press Esc." }, "0.1.0");
    expect(body.split("\n")).toEqual([
      "Bug report: Esc closes two layers", "",
      "WHAT HAPPENED", "Pressed Esc once in Settings.", "",
      "HOW TO MAKE IT HAPPEN AGAIN", "Open Settings, press Esc.", "",
      "----", REPORT_HEADING, "Heel 0.1.0 · macOS",
    ]);
    expect(feedbackMail(bug, "0.1.0").body).not.toContain("HOW TO MAKE IT HAPPEN AGAIN");
  });

  it("uses the idea words for a feature request", () => {
    const { body } = feedbackMail({ ...bug, kind: "idea", more: "Plan my week." }, "0.1.0");
    expect(body.startsWith("Feature request: ")).toBe(true);
    expect(body).toContain("WHAT WOULD HELP\nPressed Esc once in Settings.");
    expect(body).toContain("WHAT YOU WERE TRYING TO DO\nPlan my week.");
  });

  it("says so when the report is left out", () => {
    expect(feedbackMail({ ...bug, report: null }).body.endsWith("----\nDebug report not included.")).toBe(true);
  });

  it("trims a long report to fit one email and says where the whole one is", () => {
    const { body } = feedbackMail({ ...bug, report: "x".repeat(FEEDBACK_BODY_MAX_CHARS * 2) });
    expect(body.length).toBeLessThanOrEqual(FEEDBACK_BODY_MAX_CHARS);
    expect(body.endsWith(TRIMMED_NOTE)).toBe(true);
    expect(body.startsWith("Bug report: ")).toBe(true);
  });
});

describe("mailAsText", () => {
  it("carries the address and subject for pasting into any mail app", () => {
    expect(mailAsText({ subject: "S", body: "B" })).toBe("To: jason@theft.studio\nSubject: S\n\nB");
  });
});
