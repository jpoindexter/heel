import { it, expect } from "vitest";
import { chosenDiagnostics } from "./DiagnosticChoices";
import type { Diagnostics } from "../../shared/reports";
it("omits all diagnostics or just recent events without mutating the preview", () => {
  const facts: Diagnostics = { version: "0.1.5", os: "Mac", helperReached: false, node: null, database: null, provider: null, attention: null, crashed: true, counts: null, events: [{ at: 1, level: "error", area: "panel", event: "crash" }] };
  expect(chosenDiagnostics(facts, false, true)).toBeNull();
  expect(chosenDiagnostics(facts, true, false)?.events).toEqual([]);
  expect(chosenDiagnostics(facts, true, true)).toEqual(facts);
  expect(facts.events).toHaveLength(1);
});
