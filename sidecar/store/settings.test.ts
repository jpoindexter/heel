import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { openStore } from "./store";
import { testStore } from "./test-helpers";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("brain settings", () => {
  it("defaults to no provider and no model", () => {
    expect(testStore().settings.getBrain()).toEqual({ provider: null, model: null });
  });

  it("saves and reads back provider and model, replacing the old value", () => {
    const store = testStore();
    expect(store.settings.setBrain({ provider: "ollama", model: "gemma3:latest" })).toEqual({
      ok: true,
      value: { provider: "ollama", model: "gemma3:latest" },
    });
    store.settings.setBrain({ provider: "codex", model: null });
    expect(store.settings.getBrain()).toEqual({ provider: "codex", model: null });
  });

  it("rejects an unknown provider and an empty model with sentences that say what to do", () => {
    const store = testStore();
    const bad = store.settings.setBrain({ provider: "gpt-9000", model: null });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.message).toContain("claude, codex, ollama");
    const empty = store.settings.setBrain({ provider: "claude", model: "  " });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error.message).toContain("Leave it unset");
    expect(store.settings.getBrain()).toEqual({ provider: null, model: null });
  });

  it("survives a restart, and a corrupt stored value falls back to defaults instead of crashing", () => {
    const dir = mkdtempSync(join(tmpdir(), "heel-settings-"));
    dirs.push(dir);
    const path = join(dir, "heel.db");

    const first = openStore({ path });
    first.settings.setBrain({ provider: "claude", model: "sonnet" });
    first.close();
    const second = openStore({ path });
    expect(second.settings.getBrain()).toEqual({ provider: "claude", model: "sonnet" });
    second.close();

    const raw = new DatabaseSync(path);
    raw.prepare("UPDATE settings SET value = 'not json' WHERE key = 'brain'").run();
    raw.close();
    const third = openStore({ path });
    expect(third.settings.getBrain()).toEqual({ provider: null, model: null });
    third.close();
  });
});
