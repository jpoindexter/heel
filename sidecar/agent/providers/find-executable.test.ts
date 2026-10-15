import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findExecutable } from "./find-executable";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "heel-find-"));
  dirs.push(dir);
  return dir;
}

function makeExecutable(dir: string, name: string): string {
  const file = join(dir, name);
  writeFileSync(file, "#!/bin/sh\nexit 0\n");
  chmodSync(file, 0o755);
  return file;
}

const NAME = "heel-test-tool";

describe("findExecutable", () => {
  it("finds a program on PATH", async () => {
    const bin = tempDir();
    const file = makeExecutable(bin, NAME);
    expect(await findExecutable(NAME, { PATH: bin }, tempDir())).toBe(file);
  });

  it("prefers the explicit HEEL_<NAME>_PATH override", async () => {
    const override = makeExecutable(tempDir(), NAME);
    const bin = tempDir();
    makeExecutable(bin, NAME);
    const env = { PATH: bin, [`HEEL_${NAME.toUpperCase()}_PATH`]: override };
    expect(await findExecutable(NAME, env, tempDir())).toBe(override);
  });

  it("looks in ~/.local/bin even when PATH is short", async () => {
    const home = tempDir();
    const localBin = join(home, ".local", "bin");
    mkdirSync(localBin, { recursive: true });
    const file = makeExecutable(localBin, NAME);
    expect(await findExecutable(NAME, { PATH: "" }, home)).toBe(file);
  });

  it("returns undefined when nothing matches", async () => {
    expect(await findExecutable(NAME, { PATH: tempDir() }, tempDir())).toBeUndefined();
  });

  it("ignores a file that is not executable", async () => {
    const bin = tempDir();
    writeFileSync(join(bin, NAME), "not executable");
    expect(await findExecutable(NAME, { PATH: bin }, tempDir())).toBeUndefined();
  });
});
