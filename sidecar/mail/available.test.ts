import { describe, expect, it } from "vitest";
import { mailAppExists } from "./available";

describe("mailAppExists", () => {
  it("is true only on macOS with Mail.app on disk", () => {
    expect(mailAppExists("darwin", (p) => p === "/System/Applications/Mail.app")).toBe(true);
    expect(mailAppExists("darwin", () => false)).toBe(false);
    expect(mailAppExists("linux", () => true)).toBe(false);
  });
});
