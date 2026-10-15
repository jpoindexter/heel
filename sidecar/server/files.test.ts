import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { APP_ID, CONNECTION_FILE, ConnectionInfoSchema } from "../../shared/api";
import tauriConf from "../../src-tauri/tauri.conf.json";
import { removeConnectionFile, writeConnectionFile } from "./connection-file";
import { dataDir } from "./data-dir";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("dataDir", () => {
  it("uses the macOS Application Support folder named by the bundle id", () => {
    expect(dataDir({}, "/Users/me", "darwin")).toBe(`/Users/me/Library/Application Support/${APP_ID}`);
  });

  it("follows platform conventions elsewhere", () => {
    expect(dataDir({ APPDATA: "C:\\Roaming" }, "C:\\Users\\me", "win32")).toContain(APP_ID);
    expect(dataDir({}, "/home/me", "linux")).toBe(`/home/me/.local/share/${APP_ID}`);
    expect(dataDir({ XDG_DATA_HOME: "/data" }, "/home/me", "linux")).toBe(`/data/${APP_ID}`);
  });

  it("lets HEEL_DATA_DIR override everything", () => {
    expect(dataDir({ HEEL_DATA_DIR: "/tmp/x" }, "/Users/me", "darwin")).toBe("/tmp/x");
  });

  it("uses the same bundle id as the Tauri shell, so both look in the same folder", () => {
    expect(APP_ID).toBe(tauriConf.identifier);
  });
});

describe("connection file", () => {
  it("writes port and token readable only by the user, and removes them again", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "heel-conn-")), "nested");
    dirs.push(dir);
    const path = writeConnectionFile(dir, { port: 4321, token: "0123456789abcdef0123" });
    expect(path.endsWith(CONNECTION_FILE)).toBe(true);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(ConnectionInfoSchema.parse(JSON.parse(readFileSync(path, "utf8")))).toEqual({ port: 4321, token: "0123456789abcdef0123" });
    removeConnectionFile(dir);
    expect(existsSync(path)).toBe(false);
    expect(() => removeConnectionFile(dir)).not.toThrow();
  });
});
