import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { ApplicationViewSchema, type ApplicationView } from "../../shared/applications";
import type { Provider } from "../agent/providers/types";
import { inspect, fillField, clickButton, attachFile, type Inspection } from "./dom";
import { attachmentFile, saveApplication, uploadAttachment } from "./files";
import { suggestAnswers } from "./fill";
import { digest, RequestGate } from "./network";
import { resolveChromiumExecutable } from "./launch";
import { urlPolicy } from "./url";
import { safeUrl } from "./privacy";
import { cvText } from "./cv-text";
import { assistPage, screen } from "./visual";

type Options = { dir: string; headless?: boolean; testOrigins?: readonly string[] };
const fingerprint = (s: Inspection) => digest(JSON.stringify({ url: s.url, fields: s.fields, buttons: s.buttons }));

export class Applications {
  private view: ApplicationView | null = null;
  private context: BrowserContext | null = null;
  private opening: Promise<BrowserContext> | null = null;
  private generation = 0;
  private gate: RequestGate | null = null;
  private reviewed = "";
  private final = false;
  private operations = 0;
  private locked = false;
  private problem: string | null = null;
  private beforeSubmissionText = "";
  private allowed: (url: string) => Promise<void>;
  constructor(private options: Options) {
    this.allowed = urlPolicy(options.testOrigins);
    mkdirSync(options.dir, { recursive: true, mode: 0o700 });
    const file = join(options.dir, "current.json");
    if (existsSync(file)) {
      try {
        this.view = ApplicationViewSchema.parse(JSON.parse(readFileSync(file, "utf8")));
        if (this.view.status === "review") this.view.status = "interrupted";
        this.view.review = null; this.view.pending = []; this.save();
      } catch {
        copyFileSync(file, join(options.dir, `unreadable-${Date.now()}.json`));
        this.problem = "The previous application record could not be read. A copy was preserved; open the job again to start a fresh review.";
      }
    }
  }

  async exclusive<T>(run: () => Promise<T>): Promise<T> {
    if (this.locked) throw new Error("Heel is already working on this form. Wait for it to finish.");
    this.locked = true;
    try { return await run(); } finally { this.locked = false; }
  }
  private save() { if (this.view) saveApplication(this.options.dir, this.view); }
  private invalidate() { if (this.view) { this.view.review = null; this.view.pending = this.gate?.views() ?? []; if (this.gate?.problem) this.view.message = this.gate.problem; this.save(); } }
  private active() {
    if (!this.view || this.view.status !== "review" || !this.context || !this.gate) throw new Error("Open a job application first. Interrupted or uncertain submissions cannot be retried automatically.");
    if (this.operations >= 60) throw new Error("This application reached Heel's 60-action limit. Finish it in the browser or cancel it.");
    return this.view;
  }
  private page(): Page {
    const pages = this.context?.pages() ?? [];
    if (!pages.length) throw new Error("The application browser closed. Open the job again to continue.");
    if (pages.length > 8) throw new Error("Close extra application browser tabs before continuing.");
    return pages[pages.length - 1]!;
  }

  async open(input: { url: string; facts: string }) {
    await this.allowed(input.url);
    if (this.context && this.view?.status === "review") throw new Error("Cancel the current application before opening another job.");
    await this.close();
    const generation = this.generation;
    const gate = new RequestGate(() => this.invalidate(), this.allowed);
    const opening = chromium.launchPersistentContext(join(this.options.dir, "browser"), {
      executablePath: resolveChromiumExecutable(chromium), headless: this.options.headless ?? false, serviceWorkers: "block", acceptDownloads: false,
      timeout: 20_000, viewport: { width: 1100, height: 850 },
    }).catch(() => { throw new Error("Heel could not start its browser. Close previous Heel browser windows and try again. If needed, install Chrome, Brave or Edge."); });
    this.opening = opening;
    let context: BrowserContext;
    try { context = await opening; } finally { if (this.opening === opening) this.opening = null; }
    if (generation !== this.generation) { await context.close().catch(() => {}); throw new Error("Opening the browser was cancelled."); }
    this.context = context; this.gate = gate; this.final = false; this.operations = 0;
    this.problem = null; this.beforeSubmissionText = "";
    this.view = { id: randomUUID(), url: safeUrl(input.url), title: "Job application", facts: input.facts, status: "review", message: "Review the fields. Sign in or complete verification in the browser if the site asks.", fields: [], buttons: [], attachments: [], pending: [], sent: [], review: null, confirmation: null };
    this.save();
    context.setDefaultTimeout(5000);
    await gate.install(context);
    await this.page().goto(input.url, { waitUntil: "load", timeout: 25_000 }).catch(() => { this.view!.message = "The page is still loading or needs a site request approved. Refresh after checking the browser."; });
    gate.stage = true;
    return this.refresh();
  }

  async refresh() {
    if (this.view?.status === "review" && this.context) {
      if (this.gate?.navigating()) {
        this.view.pending = this.gate.views();
        const key = digest(JSON.stringify(this.view.pending));
        if (this.reviewed !== key || !this.view.review) this.view.review = randomUUID();
        this.reviewed = key; this.save();
        return { application: this.view };
      }
      const snapshot = await inspect(this.page());
      await this.allowed(snapshot.url);
      this.view.url = safeUrl(snapshot.url); this.view.title = snapshot.title;
      this.view.fields = snapshot.fields; this.view.buttons = snapshot.buttons;
      this.view.pending = this.gate?.views() ?? [];
      const key = digest(fingerprint(snapshot) + JSON.stringify(this.view.pending));
      if (this.reviewed !== key || !this.view.review) this.view.review = randomUUID();
      this.reviewed = key;
      this.save();
    }
    return { application: this.view, problem: this.problem };
  }

  async fill(facts: string, brain: { provider: Provider; model: string | null; signal?: AbortSignal }) {
    this.active(); this.invalidate(); this.operations++;
    this.view!.facts = facts;
    const before = await inspect(this.page());
    if (!before.fields.some(field => field.kind !== "file")) {
      await this.assist({ facts, goal: "Fill the application using the supplied facts and attachments, then prepare the next step or final submission for the person's review." }, brain);
      return this.refresh();
    }
    const answers = await suggestAnswers({ ...brain, facts, fields: before.fields });
    if (fingerprint(await inspect(this.page())) !== fingerprint(before)) throw new Error("The page changed while Heel was reading it. Refresh and fill again.");
    await this.edit(answers);
    this.view!.message = `Filled ${answers.length} suggested answers. Review each against your facts; missing answers were left for you.`;
    return this.refresh();
  }

  async edit(values: { id: string; value: string }[]) {
    this.active(); this.invalidate(); this.operations++;
    if (this.gate!.held.size) throw new Error("Approve or cancel the waiting site request before editing the form.");
    const snapshot = await inspect(this.page());
    for (const answer of values) {
      const field = snapshot.fields.find(f => f.id === answer.id);
      if (!field) throw new Error("A field changed. Refresh the form before editing it.");
      if (field.value !== answer.value) await fillField(this.page(), field, answer.value);
    }
    return this.refresh();
  }

  upload(input: { name: string; base64: string }) {
    this.active();
    if (this.view!.attachments.length >= 5) throw new Error("At most five attachments per application.");
    const attachment = uploadAttachment(this.options.dir, input);
    this.view!.attachments.push(attachment); this.invalidate();
    return attachment;
  }

  async readCv(id: string, facts?: string) {
    this.active();
    const attachment = this.view!.attachments.find(a => a.id === id);
    if (!attachment) throw new Error("Choose the CV again.");
    attachmentFile(this.options.dir, attachment);
    const text = await cvText(this.options.dir, attachment);
    const combined = `${facts ?? this.view!.facts}\n\nCV: ${attachment.name}\n${text}`.trim();
    if (combined.length > 20_000) throw new Error("The CV plus your facts exceeds 20,000 characters. Paste a shorter relevant extract into Applicant facts.");
    this.view!.facts = combined;
    this.invalidate(); return this.refresh();
  }

  async attach(field: string, id: string) {
    this.active(); this.invalidate(); this.operations++;
    const attachment = this.view!.attachments.find(a => a.id === id);
    if (!attachment) throw new Error("Choose the attachment again.");
    const target = (await inspect(this.page())).fields.find(f => f.id === field && f.kind === "file");
    if (!target) throw new Error("That file control changed. Refresh the form.");
    const payload = attachmentFile(this.options.dir, attachment);
    await attachFile(this.page(), field, payload);
    return this.refresh();
  }

  private async checkReview(token: string) {
    this.active();
    const current = this.gate!.navigating() ? digest(JSON.stringify(this.gate!.views())) : digest(fingerprint(await inspect(this.page())) + JSON.stringify(this.gate!.views()));
    if (!token || token !== this.view!.review || current !== this.reviewed) {
      this.invalidate(); throw new Error("The form changed or that approval expired. Refresh and review it again.");
    }
    for (const attachment of this.view!.attachments) attachmentFile(this.options.dir, attachment);
  }

  async stage(input: { button: string; final: boolean; review: string }) {
    await this.checkReview(input.review);
    if (this.gate!.held.size) throw new Error("Review the waiting site request first.");
    const snapshot = await inspect(this.page());
    if (input.final && snapshot.invalid.length) throw new Error(`Complete the required fields: ${snapshot.invalid.join(", ")}`);
    if (!snapshot.buttons.some(b => b.id === input.button)) throw new Error("That button changed. Refresh the form.");
    this.beforeSubmissionText = snapshot.text;
    this.invalidate(); this.operations++; this.final = input.final; this.gate!.stage = true;
    await clickButton(this.page(), input.button);
    // Give JS-driven forms one bounded chance to enqueue their request, never wait for a held response.
    await new Promise(resolve => setTimeout(resolve, 350));
    this.view!.message = "The selected site control was activated. Review the exact outgoing request before approving it.";
    return this.refresh();
  }

  async approve(input: { request: string; review: string }) {
    await this.checkReview(input.review);
    if (!this.gate!.held.has(input.request)) throw new Error("That request expired or was already used.");
    const request = this.gate!.held.get(input.request)!.view;
    this.invalidate(); this.operations++;
    const receipt = { id: request.id, url: request.url, method: request.method, sha256: request.sha256, approvedAt: new Date().toISOString(), httpStatus: null as number | null };
    this.view!.sent.push(receipt);
    this.view!.status = "uncertain";
    this.view!.message = "One request was approved. Its outcome must be checked before any retry.";
    this.save(); // Durable consumption precedes the external effect, including after a crash.
    try {
      const navigation = this.gate!.navigating() ? this.page().waitForNavigation({ waitUntil: "domcontentloaded", timeout: 5000 }).catch(() => null) : Promise.resolve(null);
      const status = await this.gate!.approve(input.request);
      await navigation;
      receipt.httpStatus = status;
      this.view!.message = `The site returned HTTP ${status}.`;
      if (status < 200 || status >= 400) throw new Error(`The site returned HTTP ${status}. Check the browser before trying again.`);
      if (this.final && !this.gate!.held.size) await this.confirm();
      else this.view!.status = "review";
    } catch { this.view!.message = "The approved request did not return a usable result. Inspect the browser before trying again. No automatic retry was made."; }
    this.view!.pending = this.gate!.views();
    this.save();
    return this.refresh();
  }

  private async confirm() {
    await this.page().waitForFunction(() => /application (?:has been |was )?(?:submitted|received)|thank you for (?:applying|your application)|successfully (?:applied|submitted)/i.test(document.body?.innerText ?? ""), undefined, { timeout: 8000 }).catch(() => {});
    const snapshot = await inspect(this.page());
    const confirmation = snapshot.text.match(/[^\n]*(?:application (?:has been |was )?(?:submitted|received)|thank you for (?:applying|your application)|successfully (?:applied|submitted))[^\n]*/i)?.[0]?.trim();
    if (!confirmation || this.beforeSubmissionText.includes(confirmation) || this.gate!.held.size) { this.view!.message += " Submission is unconfirmed. Inspect the browser; Heel will not retry it."; return; }
    this.view!.status = "submitted"; this.view!.confirmation = confirmation;
    this.view!.url = safeUrl(snapshot.url); this.view!.message = `The site confirmed: ${confirmation}`;
    this.view!.review = null;
  }

  async show() { await this.page().bringToFront(); return this.refresh(); }
  async browserView() {
    if (!this.view || !["review", "uncertain"].includes(this.view.status) || !this.context) throw new Error("Open an application browser first.");
    if (this.gate!.navigating()) throw new Error("Review the waiting site request before taking another screenshot.");
    return { image: (await screen(this.page())).toString("base64"), width: 1100, height: 850, steps: 0, note: "Current browser page" };
  }
  async assist(input: { facts: string; goal: string }, brain: { provider: Provider; model: string | null; signal?: AbortSignal }) {
    this.active(); this.invalidate(); this.view!.facts = input.facts;
    if (this.gate!.held.size) throw new Error("Review the waiting request before asking for another browser step.");
    const result = await assistPage({ ...input, ...brain, page: () => this.page(), pending: () => !!this.gate!.held.size,
      attachments: this.view!.attachments, final: text => { this.final = true; this.beforeSubmissionText = text; },
      file: id => { const attachment = this.view!.attachments.find(a => a.id === id); if (!attachment) throw new Error("Choose an existing attachment."); return attachmentFile(this.options.dir, attachment); },
      beforeAction: () => { this.active(); this.operations++; },
    });
    this.view!.message = result.note; await this.refresh(); return result;
  }
  async acceptObservedConfirmation(quote: string) {
    if (!this.view || this.view.status !== "uncertain" || !this.view.sent.some(sent => sent.httpStatus && sent.httpStatus >= 200 && sent.httpStatus < 400)) throw new Error("There is no sent request awaiting confirmation.");
    const page = await inspect(this.page());
    const text = quote.trim();
    if (!text || !page.text.includes(text) || this.beforeSubmissionText.includes(text)) throw new Error("Copy the site's new application acceptance message exactly.");
    this.view.status = "submitted"; this.view.confirmation = text;
    this.view.message = `You confirmed the site's application acceptance: ${text}`;
    this.view.review = null; this.save(); return { application: this.view };
  }
  async cancel() {
    if (this.view?.status === "review") { this.view.status = "cancelled"; this.view.review = null; this.view.message = "Cancelled. Waiting requests were not sent."; }
    await this.close(); this.save(); return { application: this.view };
  }
  async close() {
    this.generation++;
    const opening = this.opening;
    await this.gate?.close();
    const context = this.context ?? await opening?.catch(() => null);
    await context?.close().catch(() => {}); this.context = null; this.gate = null;
    if (this.view?.status === "review") { this.view.status = "interrupted"; this.view.review = null; this.view.message = "The browser session ended. Reopen the job to continue; no waiting request was sent."; this.save(); }
  }
  async forget() { await this.close(); this.view = null; this.problem = null; }
}
