/**
 * The JXA that talks to Calendar, Reminders and Notes. One script per app; `op` is list, add or remove.
 * Each reads one JSON argument and prints one JSON line. Kept as strings so what Heel asks each app is readable here.
 * A local date is "YYYY-MM-DD" (all day) or "YYYY-MM-DDTHH:mm", built with the Date constructor so it is local time.
 */

const LOCAL_DATE = `
  const local = (s) => { const [d, t] = s.split("T"); const [y, m, day] = d.split("-").map(Number); const [h, mi] = (t || "00:00").split(":").map(Number); return new Date(y, m - 1, day, h, mi); };
`;

/** Calendar: events whose start is in the window. Slow by nature (Calendar checks every event), hence the cache in source.ts. */
export const EVENTS = `
function run(argv) {
  const input = JSON.parse(argv[0]);
  const Calendar = Application("Calendar");
  ${LOCAL_DATE}
  if (input.op === "list") {
    const from = new Date(input.fromMs), to = new Date(input.fromMs + input.days * 86400000);
    const items = [];
    for (const cal of Calendar.calendars()) {
      const name = cal.name();
      if (input.skip.includes(name)) continue;
      // Materialise the match once: every property read on the bare specifier would run the whole predicate again.
      const found = cal.events.whose({ _and: [{ startDate: { _greaterThanEquals: from } }, { startDate: { _lessThan: to } }] })();
      for (const e of found) items.push({ id: String(e.uid()), title: String(e.summary()), start: e.startDate().toISOString(), end: e.endDate().toISOString(), allDay: Boolean(e.alldayEvent()), calendar: name, location: String(e.location() || "") });
    }
    items.sort((a, b) => (a.start < b.start ? -1 : 1));
    return JSON.stringify({ items: items.slice(0, input.limit) });
  }
  if (input.op === "add") {
    const cal = Calendar.calendars.whose({ writable: true })[0];
    const allDay = !input.start.includes("T");
    const start = local(input.start);
    const end = input.end ? local(input.end) : new Date(start.getTime() + (allDay ? 86400000 : input.defaultMinutes * 60000));
    const event = Calendar.Event({ summary: input.title, startDate: start, endDate: end, alldayEvent: allDay, location: input.location || "", description: input.notes || "" });
    cal.events.push(event);
    return JSON.stringify({ ok: true, id: String(event.uid()), where: cal.name() });
  }
  for (const cal of Calendar.calendars()) {
    try { const event = cal.events.byId(input.id); event.summary(); Calendar.delete(event); return JSON.stringify({ ok: true }); } catch (e) {}
  }
  return JSON.stringify({ ok: false, error: "not_found" });
}
`;

/** Reminders: the open ones from every list, soonest due first; a new one goes to the default list. */
export const REMINDERS = `
function run(argv) {
  const input = JSON.parse(argv[0]);
  const Reminders = Application("Reminders");
  ${LOCAL_DATE}
  if (input.op === "list") {
    const items = [];
    for (const list of Reminders.lists()) {
      const name = list.name();
      const done = list.reminders.completed();
      const hits = []; for (let i = 0; i < done.length; i++) if (!done[i]) hits.push(i);
      if (!hits.length) continue;
      const names = list.reminders.name(), ids = list.reminders.id(), dues = list.reminders.dueDate(), bodies = list.reminders.body();
      for (const i of hits) items.push({ id: String(ids[i]), title: String(names[i]), due: dues[i] ? new Date(dues[i]).toISOString() : null, list: name, notes: String(bodies[i] || "").replace(/\\s+/g, " ").trim().slice(0, input.previewChars) });
    }
    items.sort((a, b) => ((a.due || "~") < (b.due || "~") ? -1 : 1));
    return JSON.stringify({ items: items.slice(0, input.limit) });
  }
  if (input.op === "add") {
    const list = Reminders.defaultList();
    const props = { name: input.title, body: input.notes || "" };
    if (input.due) { if (input.due.includes("T")) props.dueDate = local(input.due); else props.alldayDueDate = local(input.due); }
    const reminder = Reminders.Reminder(props);
    list.reminders.push(reminder);
    return JSON.stringify({ ok: true, id: String(reminder.id()), where: list.name() });
  }
  for (const list of Reminders.lists()) {
    try { const reminder = list.reminders.byId(input.id); reminder.name(); Reminders.delete(reminder); return JSON.stringify({ ok: true }); } catch (e) {}
  }
  return JSON.stringify({ ok: false, error: "not_found" });
}
`;

/** Notes: titles of the notes changed lately (never their text: notes hold private things); a new note goes to the default folder. */
export const NOTES = `
function run(argv) {
  const input = JSON.parse(argv[0]);
  const Notes = Application("Notes");
  if (input.op === "list") {
    const since = new Date(Date.now() - input.days * 86400000);
    const found = Notes.notes.whose({ modificationDate: { _greaterThan: since } });
    const ids = found.id(), names = found.name(), dates = found.modificationDate();
    const items = [];
    for (let i = 0; i < ids.length; i++) items.push({ id: String(ids[i]), title: String(names[i]), modified: dates[i].toISOString() });
    items.sort((a, b) => (a.modified < b.modified ? 1 : -1));
    return JSON.stringify({ items: items.slice(0, input.limit) });
  }
  if (input.op === "add") {
    const folder = Notes.defaultAccount().defaultFolder();
    const note = Notes.Note({ name: input.title, body: input.html });
    folder.notes.push(note);
    return JSON.stringify({ ok: true, id: String(note.id()), where: folder.name() });
  }
  try { const note = Notes.notes.byId(input.id); note.name(); Notes.delete(note); return JSON.stringify({ ok: true }); } catch (e) {}
  return JSON.stringify({ ok: false, error: "not_found" });
}
`;
