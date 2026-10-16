import { readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { sourceFiles } from "./size-scan";

const ROOT = join(import.meta.dirname, "..");

/** Folders under src/ and what other folders may import from them (a feature's public entry points). */
export const PUBLIC_ENTRY_POINTS: Readonly<Record<string, readonly string[]>> = {
  mascot: ["src/mascot/motion-events.ts", "src/mascot/life/activity.ts", "src/mascot/life/useActivity.ts", "src/mascot/life/useGags.ts", "src/mascot/life/config.ts"],
  settings: ["src/settings/SettingsView.tsx", "src/settings/brain-summary.ts", "src/settings/useBrainSummary.ts"],
  today: ["src/today/TodayView.tsx"],
  panel: [],
};

/** Shared, feature-free layers: they may be imported by anyone and may import no feature. */
const SHARED_LAYERS = ["api", "design", "theme", "ui"];
const FEATURES = Object.keys(PUBLIC_ENTRY_POINTS);

export type Violation = { file: string; imports: string; rule: string };

const IMPORT_PATTERN = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

function resolve(from: string, spec: string): string | null {
  if (spec.startsWith(".")) return normalize(join(dirname(from), spec));
  return null; // packages and aliases are not layer-checked
}

const stripExtension = (path: string) => path.replace(/\.(tsx?|css)$/, "");

const layerOf = (path: string): string => {
  const [top, second] = path.split("/");
  return top === "src" && second !== undefined ? `src/${second}` : (top ?? "");
};

export function findViolations(files = sourceFiles()): Violation[] {
  const out: Violation[] = [];
  for (const absolute of files) {
    const file = relative(ROOT, absolute);
    if (!/\.(ts|tsx)$/.test(file) || /\.test\.tsx?$/.test(file) || file.startsWith("quality/")) continue;
    const layer = layerOf(file);
    const text = readFileSync(absolute, "utf8");
    for (const match of text.matchAll(IMPORT_PATTERN)) {
      const target = resolve(file, match[1]!);
      if (!target) continue;
      const targetLayer = layerOf(target);
      const report = (rule: string) => out.push({ file, imports: target, rule });

      if (layer === "shared" && targetLayer !== "shared") report("shared/ is wire schemas only: it imports nothing from app code");
      if (layer === "sidecar" && targetLayer === "src") report("the helper never imports the panel");
      if (layer.startsWith("src/") && targetLayer === "sidecar") report("the panel never imports the helper: use shared/ schemas");
      if (!layer.startsWith("src/") || !targetLayer.startsWith("src/") || layer === targetLayer) continue;

      const from = layer.slice(4);
      const to = targetLayer.slice(4);
      if (SHARED_LAYERS.includes(from) && FEATURES.includes(to)) report(`src/${from} is feature-free and may not import src/${to}`);
      if (FEATURES.includes(from) && FEATURES.includes(to) && !PUBLIC_ENTRY_POINTS[to]!.some((entry) => stripExtension(entry) === stripExtension(target))) {
        report(`src/${from} may only use src/${to} through its public entry points (${PUBLIC_ENTRY_POINTS[to]!.join(", ") || "none"})`);
      }
    }
  }
  return out;
}
