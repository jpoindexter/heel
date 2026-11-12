import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Applications } from "./service";
import { applicationFixture } from "./test-fixture";
import { fakeProvider } from "../server/test-app";
import type { ApplicationView } from "../../shared/applications";

describe("real application browser", () => {
  let fixture: Awaited<ReturnType<typeof applicationFixture>>;
  beforeAll(async () => { fixture = await applicationFixture(); });
  afterAll(async () => { await fixture.close(); });
  const make = () => new Applications({ dir: mkdtempSync(join(tmpdir(), "heel-application-test-")), headless: true, testOrigins: [fixture.url] });
  const field = (view: ApplicationView, label: string) => view.fields.find(f => f.label === label)!;
  const button = (view: ApplicationView, label: string) => view.buttons.find(b => b.label === label)!;

  it("fills, corrects, attaches, reviews two steps and submits exactly once", async () => {
    const app = make();
    try {
      let view = (await app.open({ url: `${fixture.url}/job`, facts: "Iris" })).application!;
      const provider = fakeProvider("codex");
      provider.complete = async req => {
        const input = JSON.parse(req.prompt);
        return { ok: true, value: JSON.stringify({ answers: input.fields.filter((f: { label: string }) => ["Full name", "Email"].includes(f.label)).map((f: { id: string; label: string }) => ({ id: f.id, value: f.label === "Email" ? "iris@example.test" : "Iris", source: f.label === "Email" ? "iris@example.test" : "Iris" })) }) };
      };
      view = (await app.fill("Iris, iris@example.test", { provider, model: null })).application!;
      view = (await app.edit([{ id: field(view, "Full name").id, value: "Iris Test" }, { id: field(view, "Location").id, value: "ES" }])).application!;
      const before = fixture.received.length;
      view = (await app.stage({ button: button(view, "Next").id, final: false, review: view.review! })).application!;
      expect(view.pending).toHaveLength(1); expect(fixture.received).toHaveLength(before);
      const old = { request: view.pending[0]!.id, review: view.review! };
      view = (await app.approve(old)).application!;
      view = (await app.refresh()).application!;
      expect(fixture.received.at(-1)?.fields.name).toBe("Iris Test");
      await expect(app.approve(old)).rejects.toThrow();
      view = (await app.edit([{ id: field(view, "Cover letter").id, value: "I conduct research." }, { id: field(view, "I confirm the supplied answers are accurate").id, value: "true" }])).application!;
      const attachment = app.upload({ name: "iris-cv.txt", base64: Buffer.from("Synthetic Iris CV").toString("base64") });
      view = (await app.attach(field(view, "CV").id, attachment.id)).application!;
      view = (await app.stage({ button: button(view, "Submit application").id, final: true, review: view.review! })).application!;
      expect(fixture.received.filter(r => r.path === "/submit")).toHaveLength(0);
      expect(view.pending[0]!.body).toContain("iris-cv.txt");
      const approval = { request: view.pending[0]!.id, review: view.review! };
      view = (await app.approve(approval)).application!;
      expect(view.status).toBe("submitted"); expect(view.confirmation).toContain("HEEL-TEST-001");
      const sent = fixture.received.filter(r => r.path === "/submit");
      expect(sent).toHaveLength(1); expect(sent[0]!.files).toEqual([{ name: "iris-cv.txt", text: "Synthetic Iris CV" }]);
      expect(view.sent).toHaveLength(2); expect(view.sent.every(r => r.httpStatus === 200)).toBe(true);
      await expect(app.approve(approval)).rejects.toThrow();
    } finally { await app.close(); }
  }, 40_000);

  it("holds an AJAX CV upload and denial sends nothing", async () => {
    const app = make(), before = fixture.received.length;
    try {
      let view = (await app.open({ url: `${fixture.url}/upload-job`, facts: "" })).application!;
      const attachment = app.upload({ name: "cv.txt", base64: Buffer.from("CV").toString("base64") });
      view = (await app.attach(field(view, "CV").id, attachment.id)).application!;
      // The event handler enqueues an AJAX request after setInputFiles resolves.
      for (let i = 0; i < 10 && !view.pending.length; i++) { await new Promise(r => setTimeout(r, 30)); view = (await app.refresh()).application!; }
      expect(view.pending).toHaveLength(1); expect(fixture.received).toHaveLength(before);
      await app.cancel(); expect(fixture.received).toHaveLength(before);
    } finally { await app.close(); }
  }, 20_000);

  it("refuses missing required fields and leaves interrupted authority unusable", async () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-interrupted-"));
    const app = new Applications({ dir, headless: true, testOrigins: [fixture.url] });
    try {
      const view = (await app.open({ url: `${fixture.url}/job`, facts: "" })).application!;
      await expect(app.stage({ button: button(view, "Next").id, final: true, review: view.review! })).rejects.toThrow("required fields");
      const restarted = new Applications({ dir, headless: true, testOrigins: [fixture.url] });
      expect((await restarted.refresh()).application!.status).toBe("interrupted");
      expect(JSON.parse(readFileSync(join(dir, "current.json"), "utf8")).review).toBeNull();
    } finally { await app.close(); }
  }, 20_000);

  it("does not call an ambiguous response a submission or retry it", async () => {
    const app = make();
    try {
      let view = (await app.open({ url: `${fixture.url}/uncertain`, facts: "" })).application!;
      view = (await app.edit([{ id: field(view, "Full name").id, value: "Iris" }])).application!;
      view = (await app.stage({ button: button(view, "Submit application").id, final: true, review: view.review! })).application!;
      const approval = { request: view.pending[0]!.id, review: view.review! };
      view = (await app.approve(approval)).application!;
      expect(view.status).toBe("uncertain"); expect(view.confirmation).toBeNull();
      await expect(app.approve(approval)).rejects.toThrow();
      expect(fixture.received.filter(r => r.path === "/unknown")).toHaveLength(1);
    } finally { await app.close(); }
  }, 25_000);

  it("fills shadow DOM inside an iframe and accessible custom/multiple selects", async () => {
    const app = make();
    try {
      let view = (await app.open({ url: `${fixture.url}/embedded`, facts: "" })).application!;
      expect(view.fields).toHaveLength(1);
      view = (await app.edit([{ id: view.fields[0]!.id, value: "Iris" }])).application!;
      expect(view.fields[0]!.value).toBe("Iris");
      await app.cancel();
      view = (await app.open({ url: `${fixture.url}/widgets`, facts: "" })).application!;
      view = (await app.edit([{ id: field(view, "Location").id, value: "Spain" }, { id: field(view, "Skills").id, value: '["research","design"]' }])).application!;
      expect(field(view, "Location").value).toBe("Spain");
      expect(field(view, "Skills").value).toBe('["research","design"]');
    } finally { await app.close(); }
  }, 20_000);

  it("rejects stale review tokens and detects changed attachment bytes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-stale-test-"));
    const app = new Applications({ dir, headless: true, testOrigins: [fixture.url] });
    try {
      let view = (await app.open({ url: `${fixture.url}/job`, facts: "" })).application!;
      const stale = view.review!;
      view = (await app.edit([{ id: field(view, "Full name").id, value: "Iris" }])).application!;
      await expect(app.stage({ button: button(view, "Next").id, final: false, review: stale })).rejects.toThrow("changed");
      const upload = app.upload({ name: "cv.txt", base64: Buffer.from("Synthetic CV").toString("base64") });
      expect(upload.sha256).toHaveLength(64);
      view = (await app.readCv(upload.id, "Unsaved applicant note")).application!;
      expect(view.facts).toContain("Synthetic CV");
      expect(view.facts).toContain("Unsaved applicant note");
      writeFileSync(join(dir, "attachments", upload.id), "Changed CV bytes");
      await expect(app.stage({ button: button(view, "Next").id, final: false, review: view.review! })).rejects.toThrow("attachment changed");
    } finally { await app.close(); }
  }, 20_000);

  it("imports scanned CV text into facts and preserves those facts when another PDF is locked", async () => {
    const app = make();
    try {
      await app.open({ url: `${fixture.url}/job`, facts: "Existing applicant note" });
      const upload = (name: string) => app.upload({ name, base64: readFileSync(new URL(`./fixtures/${name}`, import.meta.url)).toString("base64") });
      const scan = upload("scanned.pdf");
      const view = (await app.readCv(scan.id, "Unsaved applicant note")).application!;
      expect(view.facts).toContain("Unsaved applicant note");
      expect(view.facts).toContain("Research experience in Spain");
      const locked = upload("locked.pdf");
      await expect(app.readCv(locked.id, "Do not overwrite facts on failure")).rejects.toThrow("could not read");
      expect((await app.refresh()).application!.facts).toBe(view.facts);
    } finally { await app.close(); }
  }, 50_000);

  it("cancels an active model fill before it can write any form answers", async () => {
    const app = make(), provider = fakeProvider("codex");
    let release: () => void = () => {}, started: () => void = () => {};
    const began = new Promise<void>(resolve => { started = resolve; });
    provider.complete = async () => { started(); await new Promise<void>(resolve => { release = resolve; }); return { ok: true, value: '{"answers":[]}' }; };
    try {
      await app.open({ url: `${fixture.url}/job`, facts: "Iris" });
      const work = app.exclusive(() => app.fill("Iris", { provider, model: null }));
      const failed = expect(work).rejects.toThrow();
      await began;
      await app.cancel(); release(); await failed;
      expect((await app.refresh()).application!.status).toBe("cancelled");
    } finally { release(); await app.close(); }
  }, 20_000);

  it("preserves an unreadable record without preventing Heel from starting", async () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-corrupt-test-"));
    writeFileSync(join(dir, "current.json"), "not valid JSON");
    const app = new Applications({ dir });
    const state = await app.refresh();
    expect(state.application).toBeNull();
    expect("problem" in state && state.problem).toContain("copy was preserved");
    expect(readFileSync(join(dir, "current.json"), "utf8")).toBe("not valid JSON");
  });
});
