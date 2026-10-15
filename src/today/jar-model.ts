import type { TaskDto } from "../../shared/api";
import type { MethodNumbers, Sizing } from "../../shared/method";

export type Jar = {
  rocks: number;
  pebbles: number;
  sand: number;
  /** Minutes the rocks and pebbles add up to, when sizes are on and known; null otherwise. */
  minutes: number | null;
  full: boolean;
  /** "2 rocks, 3 pebbles · about 3 h of 4" */
  line: string;
};

/** Without sizes the jar is counted: this many rocks and pebbles together is a day. */
export const ROCKS_AND_PEBBLES_PER_DAY = 6;
const MIN_PER_HOUR = 60;

export function hoursText(minutes: number): string {
  const hours = Math.floor(minutes / MIN_PER_HOUR);
  const rest = minutes % MIN_PER_HOUR;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The jar's state for the open tasks. Full = more rocks than the day holds, or the rocks and pebbles outgrow the day's minutes (or count). */
export function jarFor(tasks: readonly TaskDto[], numbers: MethodNumbers, sizing: Sizing): Jar {
  const rocks = tasks.filter((t) => t.bucket === "rock");
  const pebbles = tasks.filter((t) => t.bucket === "pebble");
  const sand = tasks.filter((t) => t.bucket === "sand").length;
  const sized = [...rocks, ...pebbles].filter((t) => t.size !== null);
  const minutes = sizing === "tshirt" && sized.length > 0 ? sized.reduce((sum, t) => sum + numbers.sizeMinutes[t.size!], 0) : null;
  const full = rocks.length > numbers.maxRocks || (minutes !== null ? minutes > numbers.jarCapacityMin : rocks.length + pebbles.length > ROCKS_AND_PEBBLES_PER_DAY);
  const counts = `${plural(rocks.length, "rock", "rocks")}, ${plural(pebbles.length, "pebble", "pebbles")}`;
  const line = minutes !== null ? `${counts} · about ${hoursText(minutes)} of ${hoursText(numbers.jarCapacityMin)}` : counts;
  return { rocks: rocks.length, pebbles: pebbles.length, sand, minutes, full, line };
}

/** What Heel is asked when the jar is full. */
export const JAR_FULL_PROMPT = "The jar is full for today. Which rock or pebble should I park, and why? Pick one.";
