import { FALLBACK_SKILL, ROUTER, SKILL_SIGNALS } from "./prompt";
import type { BundledSkill } from "./skills";

/** What words choose each bundled skill, in plain words (the patterns themselves live in prompt.ts; a test keeps the two in step). */
export const TRIGGER_WORDS: Readonly<Record<string, readonly string[]>> = {
  "nd-functional-minimums": ["overwhelmed", "too much", "exhausted", "burned out", "low energy"],
  "nd-emotion-regulation": ["panic", "angry", "ashamed", "anxious", "meltdown"],
  "nd-task-initiation": ["stuck", "can't start", "avoiding", "procrastinating", "(also when nothing else fits)"],
  "nd-hyperfocus-guard": ["rabbit hole", "tangent", "distracted", "park"],
  "nd-time-blindness": ["how long", "estimate", "deadline", "minutes", "hours", "time box"],
  "nd-task-decomposition": ["plan", "break it down", "huge", "big project", "schedule", "today", "week"],
  writer: ["look into", "research", "write up", "brief", "summary", "report", "notes on"],
  "biz-weekly-review": ["weekly review", "review my week", "what did I ship"],
};

/** The skills the agent can use out of the box: the router (always), each one a signal can choose, and the fallback. */
export const BUNDLED_SKILLS: readonly BundledSkill[] = [
  { id: ROUTER, triggers: ["always"], locked: true },
  ...[...new Set([...SKILL_SIGNALS.map(([, skill]) => skill), FALLBACK_SKILL])].map((id) => ({ id, triggers: [...(TRIGGER_WORDS[id] ?? [])] })),
];
