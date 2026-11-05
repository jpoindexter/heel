import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HELP_TOPICS } from "./help-topics";
import { HelpSettings } from "./HelpSettings";

describe("HelpSettings", () => {
  it("folds each topic to its title, with its steps as an ordered list", () => {
    const html = renderToStaticMarkup(<HelpSettings />);
    expect((html.match(/<details/g) ?? []).length).toBe(HELP_TOPICS.length);
    expect(html).toContain("<ol");
    expect(html).toContain("jason@theft.studio");
  });
});
