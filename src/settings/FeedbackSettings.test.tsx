import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { FeedbackSettings } from "./FeedbackSettings";
it("opens feedback in a dialog instead of rendering the form inline in Settings", () => {
  const html = renderToStaticMarkup(<FeedbackSettings />);
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain("Send feedback");
  expect(html).not.toContain('id="feedback-title"');
});
