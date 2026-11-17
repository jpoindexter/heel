import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { resolveChromiumExecutable } from "../sidecar/applications/launch";
import { setup, fakeProvider, TOKEN } from "../sidecar/server/test-app";
const dir = mkdtempSync(join(tmpdir(), "heel-chat-layout-")), source = join(dir, "screenshot.png");
assert.equal(spawnSync("/usr/bin/swift", ["scripts/fixtures/photo.swift", "make", source]).status, 0);
const requests: { image: boolean; prompt: string }[] = [];
const provider = fakeProvider("codex");
provider.complete = async input => { requests.push({ image: !!input.image, prompt: input.prompt }); if (requests.length === 1 || requests.length === 4) return { ok: false, error: { code: "not_ready", message: "Synthetic provider unavailable." } }; return { ok: true, value: JSON.stringify({ say: "A blue circle, red square and BLUE 7. " + "A readable synthetic reply. ".repeat(20), actions: [] }) }; };
const vite = await createServer({ server: { host: "localhost", port: 0, hmr: false, watch: { ignored: ["**/*"] } }, clearScreen: false }); await vite.listen();
const origin = `http://localhost:${(vite.httpServer!.address() as AddressInfo).port}`;
const test = setup({ codex: provider }, {}, undefined, undefined, { allowedOrigins: [origin] }); test.store.onboarding.move(3); test.store.settings.setBrain({ provider: "codex", model: null });
for (const title of ["Review synthetic notes", "Finish synthetic task", "Open synthetic project"]) test.store.tasks.add({ title });
const server = serve({ fetch: request => test.app.fetch(request), hostname: "127.0.0.1", port: 0 });
await new Promise<void>(resolve => server.listening ? resolve() : server.once("listening", resolve));
const browser = await chromium.launch({ executablePath: resolveChromiumExecutable(chromium), headless: true });
const page = await browser.newPage({ viewport: { width: 280, height: 320 } }); page.setDefaultTimeout(10_000);
let updatePhase = "ready";
await page.route("**/src/updates/useUpdates.ts*", route => route.fulfill({ contentType: "application/javascript", body: `export function useUpdates(){return {phase:${JSON.stringify(updatePhase)},message:"Heel 0.1.6 is ready. Finish your work, then restart to update.",restart:async()=>{},checkNow:async()=>{window.syntheticUpdateChecks=(window.syntheticUpdateChecks||0)+1}}}` }));
const checks: string[] = [];
try {
  await page.goto(`${origin}/?window=panel&sidecar=${(server.address() as AddressInfo).port}:${TOKEN}`);
  await page.getByRole("button", { name: "What's on your mind?", exact: true }).click();
  const data = readFileSync(source).toString("base64");
  await page.locator("form.compose").evaluate((element, data) => { const transfer = new DataTransfer(); transfer.items.add(new File([Uint8Array.from(atob(data), c => c.charCodeAt(0))], "screenshot.png", { type: "image/png" })); element.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true })); }, data);
  const preview = page.getByRole("img", { name: "Attached screenshot.png", exact: true });
  const accepted = await preview.waitFor({ timeout: 2500 }).then(() => true, () => false);
  assert.equal(requests.length, 0, "Drop/import must not call the AI");
  await page.getByLabel("Tell Heel what's on your mind", { exact: true }).fill("Describe this screenshot.");
  await page.screenshot({ path: join(dir, "draft.png"), fullPage: true });
  const overlap = await page.evaluate(() => { const compose = document.querySelector(".bar-slot")!.getBoundingClientRect(), host = document.querySelector(".layer-host")!.getBoundingClientRect(); return compose.top < host.bottom - 1; });
  await page.getByRole("button", { name: "Send to Heel", exact: true }).click();
  await page.getByRole("button", { name: "Close reply", exact: true }).waitFor();
  await page.getByRole("button", { name: "Open Settings", exact: true }).click();
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  const painted = await page.locator('.layer[aria-label="Settings"]').evaluate(element => { const r = element.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest(".layer")?.getAttribute("aria-label"); });
  await page.screenshot({ path: join(dir, "settings.png"), fullPage: true });
  for (const size of [{ width: 280, height: 320 }, { width: 300, height: 420 }, { width: 640, height: 900 }]) {
    await page.setViewportSize(size);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const header = await page.locator(".panel-header").boundingBox(); assert(header && header.y >= 0 && header.height >= 24);
    assert.equal(await page.locator(".layer[inert]").evaluateAll(elements => elements.filter(el => getComputedStyle(el).visibility !== "hidden").length), 0);
  }
  await page.setViewportSize({ width: 280, height: 320 });
  const receipt = { screenshotAccepted: accepted, composerOverlapsContent: overlap, activeSettingsPaintedAs: painted, requests, dir };

  assert(accepted, "Chat must accept screenshot drops with a visible preview");
  assert.equal(overlap, false, "Composer must reserve its own room instead of covering the task list");
  assert.equal(painted, "Settings", "Active Settings must paint above the previous reply");
  assert.equal(await page.locator(".layer[inert]").evaluateAll(elements => elements.filter(el => getComputedStyle(el).visibility !== "hidden").length), 0);
  await page.getByRole("button", { name: "Reply", exact: true }).click();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByText("A blue circle, red square and BLUE 7.", { exact: false }).waitFor();
  assert.equal(requests.length, 2); assert(requests[1]!.image, "A failed image turn must retry with its original image");
  assert(requests.at(-1)?.image, "The selected photo must reach the real turn/provider boundary");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "What's on your mind?", exact: true }).click();
  await page.locator("form.compose").evaluate((element, data) => { const transfer = new DataTransfer(); transfer.items.add(new File([Uint8Array.from(atob(data), c => c.charCodeAt(0))], "pasted.png", { type: "image/png" })); element.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true })); }, data);
  await page.getByRole("img", { name: "Attached pasted.png", exact: true }).waitFor(); assert.equal(requests.length, 2);
  await page.getByRole("button", { name: "Remove attachment", exact: true }).click();
  assert.equal(await page.getByRole("img", { name: "Attached pasted.png", exact: true }).count(), 0);
  const pickerOpened = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Attach screenshot or photo", exact: true }).click();
  const picker = await pickerOpened;
  await page.waitForTimeout(3000);
  assert.equal(await page.locator("form.compose").count(), 1, "A file picker must not lose its composer to the idle timer");
  await picker.setFiles(source);
  await page.getByRole("img", { name: "Attached screenshot.png", exact: true }).waitFor();
  await page.getByRole("button", { name: "Send to Heel", exact: true }).click();
  await page.getByText("A blue circle, red square and BLUE 7.", { exact: false }).waitFor(); assert.equal(requests.length, 3); assert(requests[2]!.image);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Photos", exact: true }).click(); await page.getByLabel("Choose photos", { exact: true }).setInputFiles(source);
  await page.getByRole("img", { name: "Preview of screenshot.png", exact: true }).waitFor();
  assert.equal(requests.length, 3); assert.equal((await test.json("/tasks")).data.tasks.length, 3);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator('.layer[aria-label="Photos"]').waitFor({ state: "hidden" });
  await page.locator(".today").evaluate((element, data) => { const transfer = new DataTransfer(); transfer.items.add(new File([Uint8Array.from(atob(data), c => c.charCodeAt(0))], "restart.png", { type: "image/png" })); element.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true })); }, data);
  await page.getByRole("img", { name: "Attached restart.png", exact: true }).waitFor(); assert.equal(requests.length, 3);
  const savedFailure = page.waitForResponse(response => response.request().method() === "PUT" && response.url().includes("/messages/") && response.request().postDataJSON()?.message?.imageRequired === true);
  await page.getByRole("button", { name: "Send to Heel", exact: true }).click(); await savedFailure;
  await page.reload(); await page.getByRole("button", { name: /^Last reply/ }).click(); await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.locator(".toast-text").filter({ hasText: "Reattach the screenshot" }).waitFor(); assert.equal(requests.length, 4);
  assert.equal(await page.evaluate(() => document.querySelector(".toast-viewport")!.getBoundingClientRect().top >= document.querySelector(".panel-header")!.getBoundingClientRect().bottom), true);
  await page.getByRole("button", { name: "Dismiss notice", exact: true }).click();
  assert.equal(JSON.stringify(test.store.messages.list()).includes(data), false, "Conversation storage must contain no image bytes");
  for (const [phase, label] of [["checking", "Checking updates…"], ["downloading", "Downloading update…"], ["error", "Update failed"], ["installing", "Restarting…"], ["idle", ""]]) {
    updatePhase = phase!; await page.reload();
    if (label) await page.getByText(label, { exact: true }).waitFor();
    else { await page.getByRole("button", { name: "Photos", exact: true }).waitFor(); assert.equal(await page.getByLabel("App updates", { exact: true }).count(), 0); }
    if (phase === "error") { await page.getByRole("button", { name: "Retry update", exact: true }).click(); assert.equal(await page.evaluate(() => (window as unknown as { syntheticUpdateChecks: number }).syntheticUpdateChecks), 1); }
  }
  checks.push("Reload preserves a reattach-required failure without persisting image bytes or sending an image-less retry; closed-chat drops open a preview; all compact update phases and Retry executed");
  checks.push("Screenshot drop/paste/picker preview, removable attachment, no upload before Send, empty-text image Send, retained failed-image retry, original task list preserved");
  checks.push("Active panel alone is painted; Settings remains scrollable without composer overlap at 280x320, 300x420 and 640x900; shared Photos import retained");
  writeFileSync(join(dir, "proof.json"), JSON.stringify({ ...receipt, checks }, null, 2)); process.stdout.write(`${JSON.stringify({ ...receipt, checks }, null, 2)}\n`);
} catch (error) { await page.screenshot({ path: join(dir, "failure.png"), fullPage: true }).catch(() => {}); process.stderr.write(`Chat/layout evidence: ${dir}\n`); throw error; }
finally { await browser.close(); await vite.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); test.store.close(); }
