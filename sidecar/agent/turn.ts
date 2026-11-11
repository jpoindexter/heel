import type { HistoryMessage } from "../../shared/api";
import { appsWanted, CALENDAR_USED, calendarSection, NOTES_USED, notesSection, REMINDERS_USED, remindersSection } from "../apps/sections";
import type { AppsRead } from "../apps/source";
import type { MailSource } from "../mail/source";
import { WEEK_DAYS } from "../store/history";
import type { Store } from "../store/store";
import { parseAgentReply } from "./actions";
import { executeActions, type ActionOutcome, type SideEffects } from "./execute";
import { buildSnapshot, buildSystemPrompt, buildUserPrompt, loadSkill, mailSection, selectSkills, wantsMail, wantsWeb, wantsWeek, WEEK_USED, weekSection, type MailLine, type SkillLoader } from "./prompt";
import type { Provider, ProviderErrorCode, ProviderId } from "./providers/types";
import type { SkillsService } from "./skills";

export const MAX_USER_CHARS = 4_000;
const MAX_ATTEMPTS = 2; // one retry with the rejection reason, then stop

export type TurnError = { code: ProviderErrorCode | "bad_reply" | "empty_input"; message: string };

export type TurnResult =
  | { ok: true; say: string; applied: ActionOutcome[]; skills: string[]; provider: ProviderId }
  | { ok: false; error: TurnError };

export type TurnDeps = {
  store: Store;
  applications?: SideEffects["applications"];
  provider: Provider;
  model: string | null;
  loadSkill?: SkillLoader;
  /** Bundled and your own skills (N3). Absent = the bundled ones only, as in tests. */
  skills?: SkillsService;
  /** Apple Mail: draft_email, and reading unread mail when the person asks about their email. Absent = those fail with a sentence. */
  mail?: Pick<MailSource, "draft" | "candidates">;
  /** Calendar, Reminders and Notes, read when the person asks about them. Absent = never read. */
  apps?: AppsRead;
  /** The PDF printer, for make_pdf. Absent = that action fails with a sentence. */
  makePdf?: SideEffects["makePdf"];
  /** When it aborts the turn stops and nothing is written. */
  signal?: AbortSignal;
};

/** Named in "Used:" so the person can see their mail was read for this answer. */
export const MAIL_USED = "mail-inbox";

/** Unread mail through Apple Mail (read only). A failure becomes a sentence the model passes on. */
async function readUnread(mail: Pick<MailSource, "candidates">): Promise<{ ok: true; items: MailLine[] } | { ok: false; message: string }> {
  const found = await mail.candidates();
  if (!found.ok) return { ok: false, message: found.error.message };
  return { ok: true, items: found.value.map((m) => ({ id: m.id, from: m.from, subject: m.subject, date: m.date, snippet: m.snippet })) };
}

const turnError = (code: TurnError["code"], message: string): TurnResult => ({ ok: false, error: { code, message } });

/** The apps the message is about, read side by side (each read only), as prompt sections plus what to name in "Used:". */
async function readApps(apps: AppsRead | undefined, text: string, now: number): Promise<{ sections: string[]; used: string[] }> {
  const wanted = appsWanted(text, apps);
  type Read = Promise<[section: string, used: string]>;
  const reads: Read[] = [];
  if (wanted.calendar) reads.push(apps!.events(now).then((r) => [calendarSection(r), CALENDAR_USED]));
  if (wanted.reminders) reads.push(apps!.reminders().then((r) => [remindersSection(r), REMINDERS_USED]));
  if (wanted.notes) reads.push(apps!.notes().then((r) => [notesSection(r), NOTES_USED]));
  const done = await Promise.all(reads);
  return { sections: done.map(([section]) => section), used: done.map(([, used]) => used) };
}

/**
 * One conversational turn: build state + nd-skills prompt, ask the provider, validate the reply,
 * then apply only validated actions. Model proposes, app disposes: nothing is written before parsing succeeds.
 */
export async function runTurn(deps: TurnDeps, userText: string, history: readonly HistoryMessage[] = []): Promise<TurnResult> {
  const text = userText.trim();
  if (!text) return turnError("empty_input", "Type what's on your mind first.");
  if (text.length > MAX_USER_CHARS) {
    return turnError("empty_input", `That message is ${text.length} characters. Keep it under ${MAX_USER_CHARS}, or split it.`);
  }

  const skills = selectSkills(text, deps.skills?.forSelection());
  const system = buildSystemPrompt(skills, deps.loadSkill ?? deps.skills?.load ?? loadSkill);
  const [mailRead, apps] = await Promise.all([wantsMail(text) && deps.mail ? readUnread(deps.mail) : null, readApps(deps.apps, text, Date.now())]);
  const week = wantsWeek(text) ? weekSection(deps.store.history.list(WEEK_DAYS)) : null;
  const snapshot = buildSnapshot(deps.store, [...(mailRead ? [mailSection(mailRead)] : []), ...apps.sections, ...(week ? [week] : [])]);
  const mailRefs = mailRead?.ok ? new Map(mailRead.items.map((m, i) => [`m${i + 1}`, { id: m.id, from: m.from, subject: m.subject }])) : undefined;
  if (mailRead) skills.push(MAIL_USED);
  if (week) skills.push(WEEK_USED);
  skills.push(...apps.used);
  const basePrompt = buildUserPrompt(snapshot, text, history);

  let prompt = basePrompt;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const response = await deps.provider.complete({ system, prompt, model: deps.model, web: wantsWeb(text), signal: deps.signal });
    if (!response.ok) return { ok: false, error: response.error };
    if (deps.signal?.aborted) return turnError("aborted", "Stopped.");

    const parsed = parseAgentReply(response.value);
    if (parsed.ok) {
      const applied = await executeActions(deps.store, parsed.reply.actions, snapshot.refs, { mail: deps.mail, makePdf: deps.makePdf, mailRefs, applications: deps.applications });
      return { ok: true, say: parsed.reply.say, applied, skills, provider: deps.provider.id };
    }
    prompt = `${basePrompt}\n\nYour previous reply was rejected: ${parsed.error}. Reply again with ONLY the JSON object.`;
  }
  return turnError("bad_reply", "The model didn't answer in the format Heel needs. Try again, or pick another model in Settings > Brain.");
}
