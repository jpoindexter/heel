import { beforeAll, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { setup, fakeProvider } from "./test-app";
import { nativePhoto } from "../photos/native";
import type { Photo } from "../../shared/photos";
const dir = mkdtempSync(join(tmpdir(), "heel-photo-routes-"));
let photo: Photo;
beforeAll(async () => {
  const path = join(dir, "original.png");
  const made = spawnSync("/usr/bin/swift", ["scripts/fixtures/photo.swift", "make", path]);
  if (made.status !== 0) throw new Error(made.stderr.toString());
  photo = await nativePhoto(readFileSync(path).toString("base64"), { operation: "import" });
}, 30_000);
it("delivers decoded image pixels to the selected provider only when asked", async () => {
  let requests = 0;
  const provider = fakeProvider("codex");
  provider.complete = async input => { requests++; expect(input.image?.data).toMatch(/^iVBOR/); expect(input.prompt).toBe("Describe the colors"); return { ok: true, value: "blue and red" }; };
  const test = setup({ codex: provider });
  test.store.settings.setBrain({ provider: "codex", model: null });
  expect(await test.post("/photos/import", { data: photo.data })).toMatchObject({ ok: true }); expect(requests).toBe(0);
  expect(await test.post("/photos/ask", { photo, prompt: "Describe the colors" })).toMatchObject({ ok: true, data: { answer: "blue and red" } }); expect(requests).toBe(1);
  expect(await test.post("/photos/text", photo)).toMatchObject({ ok: true, data: { answer: expect.stringMatching(/BLUE\s*7/) } }); expect(requests).toBe(1);
});
it("saves a separate valid PNG without overwriting anything or leaking input paths", async () => {
  const revealed: string[] = [];
  const test = setup({}, {}, undefined, undefined, { dataDir: dir, openFile: async path => { revealed.push(path); return true; } });
  const first = await test.post("/photos/save", photo), second = await test.post("/photos/save", photo);
  expect(first).toMatchObject({ ok: true, data: { revealed: true } }); expect(first.data.path).not.toBe(second.data.path);
  expect(readFileSync(first.data.path).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a"); expect(revealed).toHaveLength(2);
});
it("rejects invalid input and absent image-edit capability with actionable failures", async () => {
  const test = setup();
  expect(await test.post("/photos/import", { data: "invalid" })).toMatchObject({ ok: false, error: { code: "invalid" } });
  expect(await test.post("/photos/transform", { photo, transform: { operation: "crop", x: 0, y: 0, width: -1, height: 1 } })).toMatchObject({ ok: false });
  expect(await test.post("/photos/edit", { photo, prompt: "Change the background" })).toMatchObject({ ok: false });
});
it("accepts edited bytes only through the validated native decoder", async () => {
  const test = setup({}, {}, undefined, undefined, { photoEditor: { ready: async () => true, edit: async () => ({ ok: true, value: "AAAA" }) } });
  expect(await test.post("/photos/edit", { photo, prompt: "Change the background" })).toMatchObject({ ok: false });
});
