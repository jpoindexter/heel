import { describe, expect, it } from "vitest";
const rustSources = import.meta.glob("../src-tauri/src/*.rs", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const libRs = rustSources["../src-tauri/src/lib.rs"] ?? "";
const allRust = Object.values(rustSources).join("\n");
import { LIFE_COMMAND_EVENT, OPEN_SETTINGS_EVENT, FADE_EVENT, PANEL_ANCHOR_EVENT, PANEL_VISIBLE_EVENT, RUN_EVENT, WALK_FINISHED_EVENT } from "./events";

const sources = import.meta.glob("./**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function registeredCommands(): Set<string> {
  const handler = libRs.match(/generate_handler!\[([^\]]*)\]/);
  return new Set(
    (handler?.[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
}

function invokedCommands(): string[] {
  const names: string[] = [];
  for (const [file, text] of Object.entries(sources)) {
    if (file.includes(".test.")) continue;
    for (const match of text.matchAll(/invoke\(\s*"([^"]+)"/g)) names.push(match[1]);
  }
  return names;
}

describe("Tauri command contract", () => {
  it("finds at least one registered command and one invoke call", () => {
    expect(registeredCommands().size).toBeGreaterThan(0);
    expect(invokedCommands().length).toBeGreaterThan(0);
  });

  it("registers every command the frontend invokes", () => {
    const registered = registeredCommands();
    const missing = invokedCommands().filter((name) => !registered.has(name));
    expect(missing, `invoke() names with no #[tauri::command] in lib.rs: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("Tauri event contract", () => {
  it.each([
    ["OPEN_SETTINGS_EVENT", OPEN_SETTINGS_EVENT],
    ["PANEL_VISIBLE_EVENT", PANEL_VISIBLE_EVENT],
    ["LIFE_COMMAND_EVENT", LIFE_COMMAND_EVENT],
    ["WALK_FINISHED_EVENT", WALK_FINISHED_EVENT],
    ["RUN_EVENT", RUN_EVENT],
    ["FADE_EVENT", FADE_EVENT],
    ["PANEL_ANCHOR_EVENT", PANEL_ANCHOR_EVENT],
  ])("uses the same name for %s in Rust and TypeScript", (constant, typescript) => {
    const rust = allRust.match(new RegExp(`${constant}: &str = "([^"]+)"`))?.[1];
    expect(rust).toBe(typescript);
  });
});
