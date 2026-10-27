import { describe, expect, it } from "vitest";
import { undoSaid, undoThen } from "./undo-said";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("undoSaid / undoThen", () => {
  it("shows the refusal sentence a save answers with, and stays quiet when it saved", async () => {
    const failed: string[] = [];
    let reloaded = 0;
    const after = async () => void reloaded++;
    undoSaid(async () => "The helper is not running.", (m) => failed.push(m), after)();
    undoSaid(async () => null, (m) => failed.push(m), after)();
    await tick();
    expect(failed).toEqual(["The helper is not running."]);
    expect(reloaded).toBe(2);
  });

  it("turns a refused helper call into its message and reloads either way", async () => {
    const failed: string[] = [];
    let reloaded = 0;
    const refresh = async () => void reloaded++;
    undoThen(async () => ({ ok: false, error: { code: "offline", message: "No answer." } }), refresh, (m) => failed.push(m))();
    undoThen(async () => ({ ok: true, data: {} }), refresh, (m) => failed.push(m))();
    await tick();
    expect(failed).toEqual(["No answer."]);
    expect(reloaded).toBe(2);
  });
});
