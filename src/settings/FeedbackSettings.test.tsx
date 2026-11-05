import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeedbackSettings } from "./FeedbackSettings";

describe("FeedbackSettings", () => {
  it("names the recipient, labels every field, and keeps Write disabled until there is something to send", () => {
    const html = renderToStaticMarkup(<FeedbackSettings />);
    expect(html).toContain("jason@theft.studio");
    expect(html).toContain('for="feedback-title"');
    expect(html).toContain('for="feedback-what"');
    expect(html).toContain("What happened");
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });
});
