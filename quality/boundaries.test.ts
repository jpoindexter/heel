import { describe, expect, it } from "vitest";
import { findViolations } from "./boundaries";

describe("import boundaries", () => {
  it("keeps layers apart: shared/ pure, helper and panel separate, features only through public entry points", () => {
    expect(findViolations().map((v) => `${v.file} -> ${v.imports}: ${v.rule}`)).toEqual([]);
  });
});
