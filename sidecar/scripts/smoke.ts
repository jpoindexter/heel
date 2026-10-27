/**
 * End-to-end smoke test: the real routes and store (in memory) over real HTTP, a fake AI and a fake Mail; nothing of yours touched.
 *   npm run smoke
 * Exits non-zero at the first thing that is not as expected. Run it before every build.
 */
import { serve } from "@hono/node-server";
import type { Provider, ProviderId } from "../agent/providers/types";
import { fakeMail } from "../mail/source";
import { setup, TOKEN } from "../server/test-app";
import { DEV_ORIGIN } from "../server/app";

const TURN_REPLY = '{"say":"Added it.","actions":[{"type":"add_task","title":"Smoke task from the AI","now_step":"Open the file"}]}';
const DIGEST_REPLY = '{"items":[{"id":"m1","summary":"They ask you to send it by Friday.","task":"Send Aoi the panel"}]}';
/** The fake AI answers in the shape each prompt asks for: the digest prompt names triage, the turn prompt does not. */
const answer = (system: string) => (/triage their email/.test(system) ? DIGEST_REPLY : TURN_REPLY);

const fake = (id: ProviderId): Provider => ({
  id,
  label: id,
  status: async () => ({ id, label: id, installed: true, ready: true, detail: "fake" }),
  models: async () => ({ ok: true, value: [] }),
  complete: async (request) => ({ ok: true, value: answer(request.system) }),
});

/** The same wiring the route tests use (in-memory store, fake Mail, fake providers), served over real HTTP. */
const { app, store } = setup(
  { claude: fake("claude"), codex: fake("codex"), ollama: fake("ollama") },
  {},
  fakeMail([{ id: "m1", from: "Aoi", subject: "Panel", date: new Date().toISOString(), snippet: "Can you send it by Friday?" }]),
);

const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
const port = await new Promise<number>((resolve) => server.on("listening", () => resolve((server.address() as { port: number }).port)));
const base = `http://127.0.0.1:${port}`;

let failures = 0;
const step = (name: string, okay: boolean, detail?: unknown) => {
  console.log(`${okay ? "ok  " : "FAIL"} ${name}${okay ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!okay) failures += 1;
};
type Envelope = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };
async function call(method: string, path: string, body?: unknown): Promise<Envelope> {
  const response = await fetch(base + path, {
    method,
    headers: { "x-heel-token": TOKEN, "content-type": "application/json", origin: DEV_ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as Envelope;
  } catch {
    return { ok: false, error: { code: "http", message: `${response.status} ${text.slice(0, 80)}` } };
  }
}

try {
  const noToken = await fetch(`${base}/health`);
  step("a request without the token is refused", noToken.status === 401);
  step("health answers", (await call("GET", "/health")).ok);

  const added = await call("POST", "/tasks", { title: "Smoke: pay the invoice" });
  step("a task is added without the AI", added.ok, added);
  const taskId = (added.data?.task as { id: string } | undefined)?.id ?? "";

  step("the brain can be set", (await call("PUT", "/brain", { provider: "claude", model: null })).ok);
  const turn = await call("POST", "/turn", { text: "Add a smoke task", history: [] });
  const applied = (turn.data?.applied as { type: string; ok: boolean }[] | undefined) ?? [];
  step("a turn applies the AI's add_task with a receipt", turn.ok && applied.length === 1 && applied[0]!.ok, turn);

  const tasks = await call("GET", "/tasks");
  step("both tasks are listed", ((tasks.data?.tasks as unknown[]) ?? []).length === 2, tasks);

  const focus = await call("POST", "/focus/start", { goal: "Pay the invoice", taskId, realisticMin: 25 });
  const focusId = (focus.data?.focus as { id: string } | undefined)?.id ?? "";
  step("a time-box starts", focus.ok && focusId !== "", focus);
  const ended = await call("POST", `/focus/${focusId}/end`, { outcome: "done" });
  step("the time-box ends as done", ended.ok, ended);

  const completed = await call("POST", `/tasks/${taskId}/complete`);
  step("a task completes", completed.ok, completed);
  const history = await call("GET", "/history?days=1");
  step("history has today", history.ok, history);

  const digest = await call("POST", "/mail/digest");
  const items = (digest.data?.items as { messageId: string }[] | undefined) ?? [];
  step("the mail digest reads the fake inbox and keeps the AI's one item", digest.ok && items.length === 1 && items[0]!.messageId === "m1", digest);
  const draft = await call("POST", "/mail/reply/draft", { messageId: "m1", from: "Aoi", subject: "Panel", summary: "They ask you to send it by Friday.", instruction: "yes friday works" });
  step("a reply is drafted without sending", draft.ok && typeof draft.data?.draft === "string", draft);
  const mailStatus = await call("GET", "/mail/status");
  step("mail status answers", mailStatus.ok);

  const search = await call("GET", "/search?q=smoke");
  step("search finds the task", search.ok, search);
  const skillsList = await call("GET", "/skills");
  step("skills are listed", skillsList.ok && ((skillsList.data?.skills as unknown[]) ?? []).length > 0, skillsList);
} catch (error) {
  step("the smoke run itself", false, String(error));
} finally {
  server.close();
  store.close();
}
console.log(failures === 0 ? "\nSmoke: all good." : `\nSmoke: ${failures} failed.`);
process.exit(failures === 0 ? 0 : 1);
