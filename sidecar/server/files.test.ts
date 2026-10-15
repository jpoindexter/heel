import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { APP_ID, CONNECTION_FILE, ConnectionInfoSchema, TOKEN_HEADER } from "../../shared/api";
import tauriConf from "../../src-tauri/tauri.conf.json";
import { findRunningHelper, readConnectionFile, removeConnectionFile, writeConnectionFile } from "./connection-file";
import { dataDir } from "./data-dir";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "heel-conn-"));
  dirs.push(dir);
  return dir;
}

const INFO = { port: 4321, token: "0123456789abcdef0123" };

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
  it("writes port and token readable only by the user, reads them back, and removes them", () => {
    const dir = join(tempDir(), "nested");
    const path = writeConnectionFile(dir, INFO);
    expect(path.endsWith(CONNECTION_FILE)).toBe(true);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(ConnectionInfoSchema.parse(JSON.parse(readFileSync(path, "utf8")))).toEqual(INFO);
    expect(readConnectionFile(dir)).toEqual(INFO);
    removeConnectionFile(dir, INFO.token);
    expect(existsSync(path)).toBe(false);
    expect(() => removeConnectionFile(dir, INFO.token)).not.toThrow();
  });

  it("never removes a file that belongs to another helper", () => {
    const dir = tempDir();
    const path = writeConnectionFile(dir, INFO);
    removeConnectionFile(dir, "some-other-helpers-token");
    expect(existsSync(path)).toBe(true);
    expect(readConnectionFile(dir)).toEqual(INFO);
  });

  it("returns null when the file is missing or malformed", () => {
    const dir = tempDir();
    expect(readConnectionFile(dir)).toBeNull();
    writeFileSync(join(dir, CONNECTION_FILE), "not json");
    expect(readConnectionFile(dir)).toBeNull();
    writeFileSync(join(dir, CONNECTION_FILE), JSON.stringify({ port: 0, token: "x" }));
    expect(readConnectionFile(dir)).toBeNull();
  });
});

describe("findRunningHelper", () => {
  it("reports a helper whose recorded port answers /health with the recorded token", async () => {
    const dir = tempDir();
    writeConnectionFile(dir, INFO);
    const seen: { url: string; token: string | null }[] = [];
    const running = await findRunningHelper(dir, async (url, init) => {
      seen.push({ url: String(url), token: new Headers(init?.headers).get(TOKEN_HEADER) });
      return new Response("{}", { status: 200 });
    });
    expect(running).toEqual(INFO);
    expect(seen).toEqual([{ url: "http://127.0.0.1:4321/health", token: INFO.token }]);
  });

  it("is null when there is no file", async () => {
    expect(await findRunningHelper(tempDir(), async () => new Response("{}"))).toBeNull();
  });

  it("is null for a stale file left by a crash (nothing answers)", async () => {
    const dir = tempDir();
    writeConnectionFile(dir, INFO);
    const refused: typeof fetch = async () => {
      throw new TypeError("fetch failed");
    };
    expect(await findRunningHelper(dir, refused)).toBeNull();
  });

  it("is null when the port answers but rejects the token (some other program)", async () => {
    const dir = tempDir();
    writeConnectionFile(dir, INFO);
    expect(await findRunningHelper(dir, async () => new Response("{}", { status: 401 }))).toBeNull();
  });
});
