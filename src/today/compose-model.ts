import { MAX_TASK_TITLE } from "./quick-add";

/** What the one input does with Enter. Add is the default: instant, no AI. */
export type ComposeMode = "add" | "ask" | "park";

export type ModeInfo = { id: ComposeMode; /** On the small button. */ label: string; /** In the menu. */ menu: string; placeholder: string; maxLength: number };

export const MAX_ASK_LENGTH = 4000;
export const MAX_PARK_LENGTH = 1000;

/** Fixed order: the common thing first. */
export const MODES: readonly ModeInfo[] = [
  { id: "add", label: "Add", menu: "Add a task", placeholder: "Add a task", maxLength: MAX_TASK_TITLE },
  { id: "ask", label: "Ask", menu: "Ask Heel", placeholder: "Ask Heel anything", maxLength: MAX_ASK_LENGTH },
  { id: "park", label: "Park", menu: "Park an idea for later", placeholder: "Park an idea for later", maxLength: MAX_PARK_LENGTH },
];

export const DEFAULT_MODE: ComposeMode = "add";

export function modeInfo(id: ComposeMode): ModeInfo {
  return MODES.find((mode) => mode.id === id) ?? MODES[0]!;
}

export function isComposeMode(value: string): value is ComposeMode {
  return MODES.some((mode) => mode.id === value);
}

/** Parking is one idea and back to work; Add and Ask stay until the person changes them. */
export function modeAfterSubmit(mode: ComposeMode): ComposeMode {
  return mode === "park" ? DEFAULT_MODE : mode;
}
