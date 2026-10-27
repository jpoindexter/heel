import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PanelSettings } from "./PanelSettings";
import { StartupSettings } from "./StartupSettings";

/** Every group row in Settings is an h2 (SettingsGroup); the sections inside a group must sit one level under it. */
describe("settings section headings", () => {
  it("are h3 under the h2 group rows, so a screen reader's heading list keeps its shape", () => {
    for (const html of [renderToStaticMarkup(<PanelSettings />), renderToStaticMarkup(<StartupSettings />)]) {
      expect(html).toContain("<h3");
      expect(html).not.toContain("<h2");
    }
  });
});
