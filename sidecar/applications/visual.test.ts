import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Applications } from "./service";
import { applicationFixture } from "./test-fixture";
import { fakeProvider } from "../server/test-app";

describe("general browser fallback", () => {
  let fixture: Awaited<ReturnType<typeof applicationFixture>>;
  beforeAll(async () => { fixture = await applicationFixture(); });
  afterAll(async () => { await fixture.close(); });
  const create = () => new Applications({ dir: mkdtempSync(join(tmpdir(), "heel-visual-test-")), headless: true, testOrigins: [fixture.url] });

  it("automatically uses screenshots when form inputs are unavailable and gates the result", async () => {
    const app = create(), provider = fakeProvider("codex");
    try {
      const view = (await app.open({ url: `${fixture.url}/canvas`, facts: "" })).application!;
      expect(view.fields.filter(f => f.kind !== "file")).toHaveLength(0);
      const attachment = app.upload({ name: "cv.txt", base64: Buffer.from("Synthetic CV").toString("base64") });
      const steps = [{ type: "click", x: 200, y: 128 }, { type: "type", text: "Iris Test", source: "Iris Test" }, { type: "attach", x: 200, y: 208, attachment: attachment.id }, { type: "click", x: 200, y: 300, final: true }];
      let calls = 0;
      provider.complete = async request => { expect(request.image?.mimeType).toBe("image/png"); return { ok: true, value: JSON.stringify(steps[calls++]) }; };
      const before = fixture.received.length;
      const prepared = (await app.fill("Full name: Iris Test", { provider, model: null })).application!;
      expect(calls).toBe(4); expect(prepared.pending).toHaveLength(1); expect(fixture.received).toHaveLength(before);
      const sent = (await app.approve({ request: prepared.pending[0]!.id, review: prepared.review! })).application!;
      expect(sent.status).toBe("submitted"); expect(fixture.received).toHaveLength(before + 1);
    } finally { await app.close(); }
  }, 20_000);

  it("refuses to type an answer without a source in the supplied facts", async () => {
    const app = create(), provider = fakeProvider("codex");
    try {
      await app.open({ url: `${fixture.url}/canvas?access_token=browser-session-secret`, facts: "Iris" });
      provider.complete = async request => { expect(request.prompt).not.toContain("browser-session-secret"); return { ok: true, value: '{"type":"type","text":"invented","source":"not supplied"}' }; };
      await expect(app.assist({ facts: "Iris", goal: "Fill this page" }, { provider, model: null })).rejects.toThrow("no quoted source");
    } finally { await app.close(); }
  }, 20_000);

  it("records an unfamiliar-language confirmation only from a new observed quote", async () => {
    const app = create();
    try {
      let view = (await app.open({ url: `${fixture.url}/french`, facts: "" })).application!;
      view = (await app.edit([{ id: view.fields[0]!.id, value: "Iris" }])).application!;
      view = (await app.stage({ button: view.buttons[0]!.id, final: true, review: view.review! })).application!;
      await app.approve({ request: view.pending[0]!.id, review: view.review! });
      await expect(app.acceptObservedConfirmation("invented acceptance")).rejects.toThrow("exactly");
      // The fixture exposes an untranslated acceptance message; the person's affirmation supplies its meaning.
      const result = await app.acceptObservedConfirmation("Votre candidature a été reçue.");
      expect(result.application!.status).toBe("submitted");
      expect(result.application!.message).toContain("You confirmed");
    } finally { await app.close(); }
  }, 25_000);

  it("hands visible credential entry back without sending a screenshot to the model", async () => {
    const app = create(), provider = fakeProvider("codex"); let calls = 0;
    provider.complete = async () => { calls++; return { ok: true, value: '{}' }; };
    try {
      await app.open({ url: `${fixture.url}/password`, facts: "" });
      const result = await app.assist({ facts: "Iris", goal: "Continue this application" }, { provider, model: null });
      expect(calls).toBe(0); expect(result.note).toContain("No screenshot was sent");
    } finally { await app.close(); }
  }, 20_000);

  it("does not treat a pre-existing success phrase as a fresh confirmation", async () => {
    const app = create();
    try {
      let view = (await app.open({ url: `${fixture.url}/preexisting`, facts: "" })).application!;
      view = (await app.stage({ button: view.buttons[0]!.id, final: true, review: view.review! })).application!;
      view = (await app.approve({ request: view.pending[0]!.id, review: view.review! })).application!;
      expect(view.status).toBe("uncertain"); expect(view.confirmation).toBeNull();
      await expect(app.acceptObservedConfirmation("Application received.")).rejects.toThrow("new application acceptance");
    } finally { await app.close(); }
  }, 20_000);

  it("allows repeated scrolling when the observed page changes", async () => {
    const app = create(), provider = fakeProvider("codex"); let calls = 0;
    const steps = [{ type: "scroll", dy: 200 }, { type: "scroll", dy: 200 }, { type: "stop", reason: "Ready for review." }];
    provider.complete = async () => ({ ok: true, value: JSON.stringify(steps[calls++]) });
    try {
      await app.open({ url: `${fixture.url}/long`, facts: "" });
      const result = await app.assist({ facts: "Iris", goal: "Inspect the next sections" }, { provider, model: null });
      expect(result.steps).toBe(2); expect(calls).toBe(3);
    } finally { await app.close(); }
  }, 20_000);
});
