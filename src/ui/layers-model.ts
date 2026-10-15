/**
 * The panel's surfaces as one stack (N14). Today is the base and never leaves; every other layer arrives from a side
 * that says where it came from and goes back the same way. Back pops one; Forward returns what was just popped.
 */
export const LAYERS = ["today", "settings", "email", "reply"] as const;
export type Layer = (typeof LAYERS)[number];
export type Side = "base" | "right" | "top";

export type Stack = { open: readonly Layer[]; forward: readonly Layer[] };

export const ROOT: Stack = { open: ["today"], forward: [] };

/** Settings slides in from the right; Email and a reply drop in from the top and sit over the tasks. */
export const SIDES: Readonly<Record<Layer, Side>> = { today: "base", settings: "right", email: "top", reply: "top" };

/** Where you are, in a word or two, for the header. */
export const TITLES: Readonly<Record<Layer, string>> = { today: "Heel", settings: "Settings", email: "Email", reply: "Reply" };

export const topOf = (stack: Stack): Layer => stack.open[stack.open.length - 1] ?? "today";
export const underOf = (stack: Stack): Layer => stack.open[stack.open.length - 2] ?? "today";
export const atRoot = (stack: Stack): boolean => stack.open.length <= 1;
export const isOpen = (stack: Stack, layer: Layer): boolean => stack.open.includes(layer);

/** Open a layer on top. There is one of each: a layer already open lower down moves to the top. Forward is forgotten. */
export function push(stack: Stack, layer: Layer): Stack {
  if (layer === "today") return home(stack);
  return { open: stack.open.filter((open) => open !== layer).concat(layer), forward: [] };
}

/** One step back; the layer left is remembered for Forward. Nothing happens at the root. */
export function back(stack: Stack): Stack {
  if (atRoot(stack)) return stack;
  return { open: stack.open.slice(0, -1), forward: stack.forward.concat(topOf(stack)) };
}

export function forward(stack: Stack): Stack {
  const next = stack.forward[stack.forward.length - 1];
  if (!next) return stack;
  return { open: stack.open.concat(next), forward: stack.forward.slice(0, -1) };
}

export const home = (stack: Stack): Stack => (atRoot(stack) ? stack : ROOT);

/** How the base shows under what is open: pushed back under a side layer, dimmed under a top layer, itself when alone. */
export function baseState(stack: Stack): "flat" | "pushed" | "dim" {
  const sides = stack.open.slice(1).map((layer) => SIDES[layer]);
  if (sides.includes("right")) return "pushed";
  if (sides.includes("top")) return "dim";
  return "flat";
}

/** A two-finger swipe reaches the page as horizontal wheel deltas. Fingers moving right (negative deltas) means Back, as in Safari. */
export const SWIPE_THRESHOLD = 160;

export function swipeFrom(deltaXSum: number, threshold = SWIPE_THRESHOLD): "back" | "forward" | null {
  if (deltaXSum <= -threshold) return "back";
  if (deltaXSum >= threshold) return "forward";
  return null;
}
