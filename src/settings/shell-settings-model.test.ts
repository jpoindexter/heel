import { describe, expect, it } from "vitest";
import { parseShellSettings, SHELL_DEFAULTS, shellRefusal } from "./shell-settings-model";

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

describe("shellRefusal", () => {
  it("says what did not happen first, then what the shell said", () => {
    expect(shellRefusal("dockIcon", "NSApplication refused")).toBe("Couldn't change the Dock icon. (NSApplication refused)");
    expect(shellRefusal("alwaysOnTop", new Error("no window"))).toBe("Couldn't keep the panel on top. (no window)");
    expect(shellRefusal("alwaysOnTop", "")).toBe("Couldn't keep the panel on top.");
    expect(shellRefusal("launchAtLogin", "SMAppService: Operation not permitted")).toBe("Couldn't change whether Heel opens when you log in. (SMAppService: Operation not permitted)");
  });
});
