import { describe, expect, it } from "vitest";
import { describeWrite, noteHtml, parseLocal, proposalText, whenText, writtenText } from "./preview";

describe("app write previews", () => {
  it("reads the model's local dates as local time", () => {
    const d = parseLocal("2026-10-28T10:05");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 28, 10, 5]);
    expect(parseLocal("2026-10-28").getHours()).toBe(0);
  });

  it("says when in plain words: a span, a default hour, an all-day date, a cross-day span", () => {
    expect(whenText("2026-10-28T10:00", "2026-10-28T11:30")).toBe("Wed 28 Oct 10:00–11:30");
    expect(whenText("2026-10-28T10:00")).toBe("Wed 28 Oct 10:00–11:00");
    expect(whenText("2026-10-28")).toBe("Wed 28 Oct, all day");
    expect(whenText("2026-10-28T23:00", "2026-10-29T01:00")).toBe("Wed 28 Oct 23:00–Thu 29 Oct 01:00");
  });

  it("describes each kind the same way before and after the tap", () => {
    const event = { kind: "event" as const, title: " Dentist ", start: "2026-10-28T10:00", location: "Calle Mayor" };
    expect(proposalText(event)).toBe('Add to Calendar? "Dentist" — Wed 28 Oct 10:00–11:00, Calle Mayor');
    expect(writtenText(event, "Work")).toBe('Added to Calendar (Work): "Dentist" — Wed 28 Oct 10:00–11:00, Calle Mayor');
    expect(describeWrite({ kind: "reminder", title: "Buy milk", due: "2026-10-29T09:00" })).toBe('"Buy milk" — due Thu 29 Oct 09:00');
    expect(describeWrite({ kind: "reminder", title: "Buy milk", due: "2026-10-29" })).toBe('"Buy milk" — due Thu 29 Oct, all day');
    expect(describeWrite({ kind: "reminder", title: "Buy milk" })).toBe('"Buy milk", no date');
    expect(describeWrite({ kind: "note", title: "Ideas", body: "one two\nthree" })).toBe('"Ideas" — 3 words');
  });

  it("turns a note into Notes' HTML, one line per div, nothing unescaped, no title (Notes adds its name as the first line)", () => {
    expect(noteHtml("line one\n\n2 > 1 <b>")).toBe("<div>line one</div><div><br></div><div>2 &gt; 1 &lt;b&gt;</div>");
  });
});
