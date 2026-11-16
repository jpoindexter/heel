import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { beforeAll, expect, it } from "vitest";
import { nativePhoto, nativePhotoText } from "./native";
const dir = mkdtempSync(join(tmpdir(), "heel-photo-native-test-"));
let data: string;
beforeAll(() => {
  const result = spawnSync("/usr/bin/swift", ["scripts/fixtures/photo.swift", "make", join(dir, "original.png")]);
  if (result.status !== 0) throw new Error(result.stderr.toString());
  data = readFileSync(join(dir, "original.png")).toString("base64");
}, 30_000);
it("decodes actual photo pixels, rotates, resizes and crops while leaving the input unchanged", async () => {
  const imported = await nativePhoto(data, { operation: "import" });
  const rotated = await nativePhoto(imported.data, { operation: "rotate", angle: 90 });
  expect(rotated.width).toBe(imported.height); expect(rotated.height).toBe(imported.width);
  const resized = await nativePhoto(rotated.data, { operation: "resize", width: 200, height: 300 });
  expect(resized).toMatchObject({ width: 200, height: 300 });
  const cropped = await nativePhoto(resized.data, { operation: "crop", x: 10, y: 20, width: 90, height: 80 });
  expect(cropped).toMatchObject({ width: 90, height: 80, mimeType: "image/png" });
  writeFileSync(join(dir, "crop.png"), Buffer.from(cropped.data, "base64"));
  const inspection = spawnSync("/usr/bin/swift", ["scripts/fixtures/photo.swift", "inspect", join(dir, "crop.png")]);
  expect(JSON.parse(inspection.stdout.toString())).toMatchObject({ width: 90, height: 80 });
  expect(readFileSync(join(dir, "original.png")).toString("base64")).toBe(data);
}, 30_000);
it("reads visible text locally and rejects malformed images or out-of-bounds crops", async () => {
  expect((await nativePhotoText(data)).answer).toMatch(/BLUE\s*7/i);
  await expect(nativePhoto("AAAA", { operation: "import" })).rejects.toThrow(/Could not process/);
  await expect(nativePhoto(data, { operation: "crop", x: 10000, y: 0, width: 10, height: 10 })).rejects.toThrow(/Could not process/);
}, 30_000);
it("imports a real HEIC photo through the bundled native decoder", async () => {
  const path = join(dir, "source.heic");
  const converted = spawnSync("/usr/bin/sips", ["-s", "format", "heic", join(dir, "original.png"), "--out", path]);
  expect(converted.status, converted.stderr.toString()).toBe(0);
  const imported = await nativePhoto(readFileSync(path).toString("base64"), { operation: "import" });
  expect(imported.width).toBeGreaterThan(0); expect(imported.height).toBeGreaterThan(0); expect(imported.data).toMatch(/^iVBOR/);
}, 30_000);

it("retries one transient local OCR failure while preserving cancellation", async () => {
  let calls = 0;
  const decode = async () => { calls++; if (calls === 1) throw new Error("Vision not ready"); return { meta: { answer: "BLUE 7" }, data: "" }; };
  expect(await nativePhotoText("AAAA", undefined, decode)).toEqual({ answer: "BLUE 7" }); expect(calls).toBe(2);
  const stopped = new AbortController(); stopped.abort(); calls = 0;
  await expect(nativePhotoText("AAAA", stopped.signal, decode)).rejects.toThrow("Vision not ready"); expect(calls).toBe(1);
});
