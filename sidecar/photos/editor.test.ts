import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createPhotoEditor, readSessionPhoto, readGeneratedPhoto } from "./editor";
import { fakeDeps, OK } from "../agent/providers/test-deps";
const input = { photo: { data: "AAAA", mimeType: "image/png" as const, width: 1, height: 1 }, prompt: "Change the background", transparent: true };
it("requires a subscription login and never introduces API-key requests", async () => {
  const deps = fakeDeps({ answers: { login: OK("Logged in using ChatGPT"), features: OK("image_generation stable true") } });
  expect(await createPhotoEditor(deps).ready()).toBe(true);
  expect(await createPhotoEditor(fakeDeps({ found: false })).edit(input)).toMatchObject({ ok: false, error: { code: "not_ready" } });
  expect(await createPhotoEditor(fakeDeps({ answers: { login: OK("Logged in using an API key") } })).ready()).toBe(false);
});
it("bounds the Codex tool session and rejects a reply without an actual new image", async () => {
  const deps = fakeDeps({ answers: { login: OK("Logged in using ChatGPT"), features: OK("image_generation stable true"), exec: OK('{"error":"image tool unavailable"}') } });
  expect(await createPhotoEditor(deps).edit(input)).toMatchObject({ ok: false });
  const call = deps.calls.find(c => c.args[0] === "exec")!;
  expect(call.args).toEqual(expect.arrayContaining(["--ephemeral", "--ignore-user-config", "--ignore-rules", 'default_permissions="heel_photo"', "shell_tool", "view_image", "apps", "image_generation", "--image"]));
  expect(call.options.input).toContain("transparent_background true");
  expect(call.options.input).toContain("untrusted content");
  expect(call.args.some(arg => arg.startsWith("permissions.heel_photo.filesystem=") && arg.includes('"/"="deny"'))).toBe(true);
});
it("reads only a fresh regular file inside the generated-images root, including symlink checks", () => {
  const parent = mkdtempSync(join(tmpdir(), "heel-generated-proof-")), root = join(parent, "root");
  mkdirSync(root);
  const valid = join(root, "photo.png"), outside = join(parent, "private.png"), old = join(root, "old.png");
  writeFileSync(valid, "new image bytes"); writeFileSync(outside, "private"); writeFileSync(old, "old"); utimesSync(old, 1, 1);
  expect(readGeneratedPhoto(valid, Date.now(), root)).toBe(Buffer.from("new image bytes").toString("base64"));
  expect(() => readGeneratedPhoto(outside, Date.now(), root)).toThrow(/outside/);
  symlinkSync(outside, join(root, "link.png"));
  expect(() => readGeneratedPhoto(join(root, "link.png"), Date.now(), root)).toThrow(/outside/);
  expect(() => readGeneratedPhoto(old, Date.now(), root)).toThrow(/no new usable/);
  expect(() => readGeneratedPhoto(root, Date.now(), root)).toThrow(/no new usable/);
});
it("takes the artifact from the CLI session receipt, never a path invented in chat", () => {
  const root = mkdtempSync(join(tmpdir(), "heel-session-images-")), id = "01a1e659-1818-7ed3-8923-772be6cec714";
  mkdirSync(join(root, id)); writeFileSync(join(root, id, "exec-result.png"), "actual session image");
  const events = [{ type: "thread.started", thread_id: id }, { type: "item.completed", item: { type: "agent_message", text: '{"path":"/private/not-authorized"}' } }];
  expect(readSessionPhoto(events.map(e => JSON.stringify(e)).join("\n"), Date.now(), root)).toBe(Buffer.from("actual session image").toString("base64"));
  expect(() => readSessionPhoto(JSON.stringify({ type: "thread.started", thread_id: "../private" }), Date.now(), root)).toThrow();
  writeFileSync(join(root, id, "exec-extra.png"), "second image");
  expect(() => readSessionPhoto(events.map(e => JSON.stringify(e)).join("\n"), Date.now(), root)).toThrow(/single confirmed/);
});
