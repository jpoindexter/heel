import { describe, expect, it } from "vitest";
import pkg from "../package.json";
import tauriConf from "../src-tauri/tauri.conf.json";
import { APP_VERSION } from "./version";

describe("APP_VERSION", () => {
  it("is the one version package.json and tauri.conf.json carry", () => {
    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION).toBe(tauriConf.version);
  });
});
