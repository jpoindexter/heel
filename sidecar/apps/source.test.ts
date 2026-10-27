import { describe, expect, it } from "vitest";
import type { JxaRunner } from "../mail/jxa";
import { appleApps, CALENDAR_CACHE_MS } from "./source";

/** A runner that answers like osascript would, and remembers what each app was asked. */
function runner(answers: (app: string, input: Record<string, unknown>) => unknown) {
  const asked: { app: string; input: Record<string, unknown> }[] = [];
  const jxa = (app: string): JxaRunner => async (_script, input) => {
    asked.push({ app, input: input as Record<string, unknown> });
    return { ok: true, value: answers(app, input as Record<string, unknown>) };
  };
  return { jxa, asked };
}

const event = { id: "E1", title: "Dentist", start: "2026-10-28T09:00:00.000Z", end: "2026-10-28T10:00:00.000Z", allDay: false, calendar: "Work", location: "" };

describe("appleApps", () => {
  it("reads events once and keeps them, since Calendar is slow; a write throws the kept read away", async () => {
    const { jxa, asked } = runner((_app, input) => (input.op === "list" ? { items: [event] } : { ok: true, id: "NEW", where: "Work" }));
    const apps = appleApps(jxa);
    expect(await apps.events(1_000)).toEqual({ ok: true, value: [event] });
    await apps.events(1_000 + CALENDAR_CACHE_MS - 1);
    expect(asked.filter((a) => a.app === "Calendar")).toHaveLength(1);
    expect(asked[0]!.input).toMatchObject({ op: "list", fromMs: 1_000, days: 7, skip: ["Siri Suggestions", "Scheduled Reminders"] });
    await apps.add({ kind: "event", title: "X", start: "2026-10-28T10:00" });
    await apps.events(1_000);
    expect(asked.filter((a) => a.app === "Calendar" && a.input.op === "list")).toHaveLength(2);
  });

  it("sends each write to its app with what the script needs, and returns the id for Undo", async () => {
    const { jxa, asked } = runner(() => ({ ok: true, id: "x-apple-reminder://1", where: "Reminders" }));
    const apps = appleApps(jxa);
    expect(await apps.add({ kind: "reminder", title: "Call vet", due: "2026-10-29" })).toEqual({ ok: true, value: { id: "x-apple-reminder://1", where: "Reminders" } });
    expect(asked[0]).toEqual({ app: "Reminders", input: { op: "add", kind: "reminder", title: "Call vet", due: "2026-10-29" } });
    await apps.add({ kind: "note", title: "Vet", body: "teeth" });
    expect(asked[1]).toEqual({ app: "Notes", input: { op: "add", title: "Vet", html: "<div>Vet</div><div>teeth</div>" } });
    await apps.add({ kind: "event", title: "Dentist", start: "2026-10-28T10:00" });
    expect(asked[2]!.input).toMatchObject({ op: "add", defaultMinutes: 60 });
    await apps.remove("note", "x-coredata://1");
    expect(asked[3]).toEqual({ app: "Notes", input: { op: "remove", id: "x-coredata://1" } });
  });

  it("turns an app's refusal and an unreadable answer into sentences", async () => {
    const apps = appleApps(runner((_app, input) => (input.op === "remove" ? { ok: false, error: "not_found" } : { nonsense: true })).jxa);
    expect(await apps.reminders()).toMatchObject({ ok: false, error: { code: "app_failed", message: "Reminders answered in a way Heel couldn't read." } });
    expect(await apps.remove("event", "E9")).toMatchObject({ ok: false, error: { code: "not_found", message: "That's not in Calendar any more." } });
  });
});
