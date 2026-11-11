import { runConfirmationFlow, runVisualFlow } from "./application-visual-flow";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { Applications } from "../sidecar/applications/service";
import { applicationFixture } from "../sidecar/applications/test-fixture";
import { resolveChromiumExecutable } from "../sidecar/applications/launch";
import { fakeProvider, setup, TOKEN } from "../sidecar/server/test-app";
import { codexProvider } from "../sidecar/agent/providers/codex";
import { defaultDeps } from "../sidecar/agent/providers/registry";

const real = process.argv.includes("--real-codex");
const dir = mkdtempSync(join(tmpdir(), "heel-application-e2e-"));
const fixture = await applicationFixture();
const vite = await createServer({ server: { host: "127.0.0.1", port: 0, strictPort: false }, clearScreen: false });
await vite.listen();
const origin = `http://127.0.0.1:${(vite.httpServer!.address() as AddressInfo).port}`;
const applications = new Applications({ dir: join(dir, "applications"), headless: !process.argv.includes("--headed"), testOrigins: [fixture.url] });
const provider = real ? codexProvider(defaultDeps()) : fakeProvider("codex");
if (!real) provider.complete = async request => {
  if (request.system.includes("Actions (exact field names)")) return { ok: true, value: JSON.stringify({ say: "Opened the application for your review.", actions: [{ type: "prepare_application", url: `${fixture.url}/job`, facts: "Iris Test, iris@example.test" }] }) };
  const input = JSON.parse(request.prompt);
  const facts: Record<string, string> = { "Full name": "Iris Test", Email: "iris@example.test" };
  return { ok: true, value: JSON.stringify({ answers: input.fields.filter((f: { label: string }) => facts[f.label]).map((f: { id: string; label: string }) => ({ id: f.id, value: facts[f.label], source: facts[f.label] })) }) };
};
const test = setup({ codex: provider }, {}, undefined, undefined, { applications, allowedOrigins: [origin], dataDir: dir });
test.store.settings.setBrain({ provider: "codex", model: null });
const server = serve({ fetch: test.app.fetch, hostname: "127.0.0.1", port: 0 });
await new Promise<void>(resolve => server.listening ? resolve() : server.once("listening", resolve));
const port = (server.address() as AddressInfo).port;
const browser = await chromium.launch({ headless: !process.argv.includes("--headed"), executablePath: resolveChromiumExecutable(chromium) });
const page = await browser.newPage({ viewport: { width: 360, height: 820 } });
page.setDefaultTimeout(10_000);
const checks: string[] = [];
try {
  await page.goto(`${origin}/?window=panel&sidecar=${port}:${TOKEN}`);
  if (process.argv.includes("--confirm-foreign")) {
    checks.push(...await runConfirmationFlow({ page, fixture, applications, dir }));
  } else if (process.argv.includes("--visual")) {
    assert.ok(real, "The visual E2E requires --real-codex so it exercises actual vision.");
    checks.push(...await runVisualFlow({ page, fixture, applications, dir }));
  } else {
  if (process.argv.includes("--chat")) {
    await page.getByRole("button", { name: "What's on your mind?", exact: true }).click();
    await page.getByLabel("Tell Heel what's on your mind").fill(`Prepare this job application in Heel's application browser: ${fixture.url}/job . This is a controlled local test form. Applicant facts: Full name Iris Test; email iris@example.test. Open it for filling and review; I will approve submission in Job applications.`);
    await page.getByRole("button", { name: "Send to Heel" }).click();
    await page.getByRole("button", { name: "Review application", exact: true }).waitFor({ timeout: 110_000 });
    await page.getByRole("button", { name: "Review application", exact: true }).click();
    checks.push("natural-language request produced prepare_application and opened its review workspace");
  } else {
    await page.getByRole("button", { name: "Job applications", exact: true }).click();
    await page.getByLabel("Job application URL").fill(`${fixture.url}/job`);
    await page.getByRole("button", { name: "Open application", exact: true }).click();
  }
  await page.getByLabel("Applicant facts and answers").fill("Full name: Iris Test. Email: iris@example.test. Location: Spain.");
  await page.getByRole("button", { name: "Fill from my facts", exact: true }).click();
  await page.getByLabel("Full name (required)", { exact: true }).waitFor();
  await page.waitForFunction(() => Array.from(document.querySelectorAll("textarea")).some(el => el.value === "Iris Test"), undefined, { timeout: 70_000 });
  assert.equal(await page.getByLabel("Email (required)", { exact: true }).inputValue(), "iris@example.test");
  checks.push(`${real ? "real Codex" : "fixture model"} filled applicant facts through Heel's UI`);
  await page.getByLabel("Full name (required)", { exact: true }).fill("Iris Corrected");
  await page.getByRole("button", { name: "Save corrections to form" }).click();
  await page.getByLabel("Site button to use").selectOption({ label: "Next" });
  await page.getByRole("button", { name: "Review next step" }).click();
  await page.getByRole("button", { name: "Allow once", exact: true }).waitFor();
  assert.equal(fixture.received.length, 0);
  await page.screenshot({ path: join(dir, "01-review-before-approval.png"), fullPage: true });
  await page.getByRole("button", { name: "Allow once", exact: true }).click();
  await page.getByLabel("Cover letter (required)", { exact: true }).waitFor();
  assert.equal(fixture.received[0]!.fields.name, "Iris Corrected");
  checks.push("correction reached the site only after one approval");
  await page.getByLabel("Cover letter (required)", { exact: true }).fill("I conduct research. Synthetic test application only.");
  await page.getByLabel("I confirm the supplied answers are accurate (required)", { exact: true }).selectOption("true");
  await page.getByRole("button", { name: "Save corrections to form" }).click();
  await page.getByRole("button", { name: "Save corrections to form" }).waitFor({ state: "hidden" });
  const cv = join(dir, "iris-synthetic-cv.txt");
  writeFileSync(cv, "Iris Corrected\nSynthetic research CV. Not a real application.\n");
  await page.getByLabel("CV (required)", { exact: true }).setInputFiles(cv);
  await page.getByRole("button", { name: "Use iris-synthetic-cv.txt as facts" }).waitFor();
  await page.getByLabel("Site button to use").selectOption({ label: "Submit application" });
  await page.getByLabel("This is the final application submission").check();
  await page.getByRole("button", { name: "Review submission", exact: true }).click();
  await page.getByRole("button", { name: "Allow once", exact: true }).waitFor();
  assert.equal(fixture.received.filter(r => r.path === "/submit").length, 0);
  assert.match(await page.getByLabel("Exact request content").inputValue(), /iris-synthetic-cv.txt/);
  await page.screenshot({ path: join(dir, "02-submit-review.png"), fullPage: true });
  await page.getByRole("button", { name: "Allow once", exact: true }).click();
  await page.getByText("The site confirmed:", { exact: false }).waitFor();
  const submitted = fixture.received.filter(r => r.path === "/submit");
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0]!.fields.cover, "I conduct research. Synthetic test application only.");
  assert.equal(submitted[0]!.files[0]!.name, "iris-synthetic-cv.txt");
  assert.match(submitted[0]!.files[0]!.text, /Synthetic research CV/);
  assert.equal((await applications.refresh()).application!.sent.length, 2);
  checks.push("CV bytes, corrected name and cover letter submitted once; confirmation receipt observed");
  await page.screenshot({ path: join(dir, "03-confirmation.png"), fullPage: true });
  await page.setViewportSize({ width: 300, height: 420 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  checks.push("300×420 layout has no horizontal page overflow");
  }
  const report = { date: new Date().toISOString(), provider: real ? "real Codex" : "fixture", checks, received: fixture.received, confirmation: (await applications.refresh()).application!.confirmation, evidenceDir: dir };
  writeFileSync(join(dir, "proof.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, checks, evidenceDir: dir }, null, 2));
} catch (error) {
  await page.screenshot({ path: join(dir, "failure.png"), fullPage: true }).catch(() => {});
  console.error(`E2E failed; synthetic evidence: ${dir}`);
  throw error;
} finally {
  await applications.close(); await browser.close();
  server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  await vite.close(); await fixture.close(); test.store.close();
}
