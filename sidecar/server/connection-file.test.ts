import { mkdtempSync, rmSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONNECTION_FILE, TOKEN_HEADER } from "../../shared/api";
import { findRunningHelper, readConnectionFile, removeConnectionFile, writeConnectionFile } from "./connection-file";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "heel-conn-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const info = { port: 4321, token: "t".repeat(64) };

describe("connection file", () => {
  it("round-trips and is readable by this user only", () => {
    const path = writeConnectionFile(dir, info);
    expect(readConnectionFile(dir)).toEqual(info);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });

  it("reads nothing from a missing or broken file", () => {
    expect(readConnectionFile(dir)).toBeNull();
    writeConnectionFile(dir, info);
    const { writeFileSync } = require("node:fs") as typeof import("node:fs");
    writeFileSync(join(dir, CONNECTION_FILE), "{not json");
    expect(readConnectionFile(dir)).toBeNull();
  });

  it("only removes its own file: a second helper must never delete the first one's", () => {
    writeConnectionFile(dir, info);
    removeConnectionFile(dir, "someone-else");
    expect(existsSync(join(dir, CONNECTION_FILE))).toBe(true);
    removeConnectionFile(dir, info.token);
    expect(existsSync(join(dir, CONNECTION_FILE))).toBe(false);
  });

  it("finds a running helper only when the recorded port answers /health with the recorded token", async () => {
    writeConnectionFile(dir, info);
    const seen: { url: string; token: string | undefined }[] = [];
    const alive: typeof fetch = async (url, init) => {
      const headers = init?.headers as Record<string, string>;
      seen.push({ url: String(url), token: headers[TOKEN_HEADER] });
      return new Response("{}", { status: 200 });
    };
    expect(await findRunningHelper(dir, alive)).toEqual(info);
    expect(seen).toEqual([{ url: "http://127.0.0.1:4321/health", token: info.token }]);

    const dead: typeof fetch = async () => {
      throw new TypeError("fetch failed");
    };
    expect(await findRunningHelper(dir, dead)).toBeNull();
    const refused: typeof fetch = async () => new Response("", { status: 401 });
    expect(await findRunningHelper(dir, refused)).toBeNull();
  });

  it("treats no file as no helper, without probing", async () => {
    let probed = 0;
    const probe: typeof fetch = async () => (probed += 1, new Response("{}"));
    expect(await findRunningHelper(dir, probe)).toBeNull();
    expect(probed).toBe(0);
  });
});
