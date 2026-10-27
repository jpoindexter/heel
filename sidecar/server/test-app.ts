import type { Provider, ProviderId, ProviderResult, ProviderStatus } from "../agent/providers/types";
import { memorySecrets } from "../inbox/keychain";
import { createInbox, type InboxDeps } from "../inbox/service";
import { fakeApps, type AppsSource } from "../apps/source";
import { fakeMail, type MailSource } from "../mail/source";
import { testStore } from "../store/test-helpers";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BUNDLED_SKILLS } from "../agent/bundled-skills";
import { SKILLS_DIR } from "../agent/prompt";
import { createSkillsService } from "../agent/skills";
import type { RenderPdf } from "../pdf/make-pdf";
import { createApp, DEV_ORIGIN } from "./app";

export const TOKEN = "test-token-0123456789abcdef";
export const HOST = "127.0.0.1:5555";

type Init = RequestInit & { headers?: Record<string, string> };

export function fakeProvider(
  id: ProviderId,
  status: Partial<ProviderStatus> = {},
  models: ProviderResult<string[]> = { ok: true, value: [] },
  reply: ProviderResult<string> = { ok: true, value: "" },
): Provider {
  return {
    id,
    label: `Label ${id}`,
    status: async () => ({ id, label: `Label ${id}`, installed: true, ready: true, detail: `${id} detail`, ...status }),
    models: async () => models,
    complete: async () => reply,
  };
}

/** A real app on an in-memory store, with fake providers, called through app.request(). */
export function setup(overrides: Partial<Record<ProviderId, Provider>> = {}, inboxDeps: Partial<InboxDeps> = {}, mail: MailSource = fakeMail(), store = testStore(), extra: { openFile?: (path: string, reveal: boolean) => Promise<boolean>; renderPdf?: RenderPdf; apps?: AppsSource } = {}) {
  const providers: Record<ProviderId, Provider> = {
    claude: fakeProvider("claude"),
    codex: fakeProvider("codex", { ready: false, detail: "Not signed in. Run codex login in a terminal." }),
    ollama: fakeProvider("ollama", {}, { ok: true, value: ["qwen2.5:14b"] }),
    ...overrides,
  };
  const inbox = createInbox({ fetch: (async () => new Response("{}", { status: 500 })) as typeof fetch, secrets: memorySecrets(), now: () => 1_000_000, openUrl: async () => undefined, ...inboxDeps });
  /** A fake printer: writes a few bytes where the PDF would go. */
  const renderPdf: RenderPdf = extra.renderPdf ?? (async (_html, outPath) => (writeFileSync(outPath, "%PDF-1.3 fake"), { ok: true, path: outPath }));
  const userDir = mkdtempSync(join(tmpdir(), "heel-skills-"));
  const skills = createSkillsService({ bundledDir: SKILLS_DIR, bundled: BUNDLED_SKILLS, userDir, off: store.settings.getSkillsOff, setOff: store.settings.setSkillsOff });
  const app = createApp({ store, providers, inbox, mail, mailAvailable: true, apps: extra.apps ?? fakeApps(), token: TOKEN, allowedOrigins: [DEV_ORIGIN], openFile: extra.openFile ?? (async () => true), renderPdf, skills });
  const call = (path: string, init: Init = {}) =>
    app.request(path, { ...init, headers: { host: HOST, "x-heel-token": TOKEN, ...init.headers } });
  const json = async (path: string, init?: Init) => (await call(path, init)).json();
  const send = (method: string, path: string, body: unknown) =>
    json(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return {
    store,
    app,
    call,
    json,
    put: (body: unknown) => send("PUT", "/brain", body),
    post: (path: string, body: unknown = {}) => send("POST", path, body),
    send,
  };
}
