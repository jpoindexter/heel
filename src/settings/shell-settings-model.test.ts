import { describe, expect, it } from "vitest";
import { parseShellSettings, SHELL_DEFAULTS } from "./shell-settings-model";

describe("parseShellSettings", () => {
  it("takes the shell's answer as it is", () => {
    expect(parseShellSettings({ alwaysOnTop: true, dockIcon: false })).toEqual({ alwaysOnTop: true, dockIcon: false });
  });

  it("falls back to floating off and the Dock icon on for anything else", () => {
    expect(parseShellSettings(undefined)).toEqual(SHELL_DEFAULTS);
    expect(parseShellSettings({ alwaysOnTop: "yes" })).toEqual(SHELL_DEFAULTS);
    expect(SHELL_DEFAULTS).toEqual({ alwaysOnTop: false, dockIcon: true });
  });
});
