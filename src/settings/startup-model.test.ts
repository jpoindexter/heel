import { describe, expect, it } from "vitest";
import { loginNote, parseLoginStatus } from "./startup-model";

describe("login item status", () => {
  it("reads the shell's three answers and treats anything else as off", () => {
    expect(parseLoginStatus("on")).toBe("on");
    expect(parseLoginStatus("needs-approval")).toBe("needs-approval");
    expect(parseLoginStatus(undefined)).toBe("off");
    expect(parseLoginStatus("enabled")).toBe("off");
  });

  it("explains only the state the person has to act on", () => {
    expect(loginNote("needs-approval")).toMatch(/Login Items/);
    expect(loginNote("on")).toBeNull();
    expect(loginNote("off")).toBeNull();
  });
});
