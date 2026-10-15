import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { sourceFiles } from "./size-scan";

/** Where design values may live: the token file (and nowhere else). */
export const TOKEN_FILES = new Set(["src/design/tokens.css"]);

const COLOR_PATTERNS = [/#[0-9a-fA-F]{3,8}\b/g, /\b(?:rgb|rgba|hsl|hsla|oklch|oklab|color-mix)\(/g];
/** A literal size or duration: `12px`, `0.5rem`, `150ms`. Interpolated values like `${x}px` are computed, not literals. */
const UNIT_PATTERN = /(?<![\w$.{#-])\d*\.?\d+(?:px|rem|em|ms|vh|vw)\b/g;
const SKIP_LINE = /@media|@container|@supports/;

export type DesignHit = { file: string; line: number; text: string; kind: "color" | "unit" };

function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Hard-coded colours and literal sizes/durations in one file's text. */
export function hitsInText(file: string, text: string): DesignHit[] {
  const hits: DesignHit[] = [];
  withoutComments(text)
    .split("\n")
    .forEach((line, index) => {
      if (SKIP_LINE.test(line)) return;
      for (const pattern of COLOR_PATTERNS) for (const _ of line.matchAll(pattern)) hits.push({ file, line: index + 1, text: line.trim(), kind: "color" });
      for (const _ of line.matchAll(UNIT_PATTERN)) hits.push({ file, line: index + 1, text: line.trim(), kind: "unit" });
    });
  return hits;
}

/** Every hit in design-bearing source (CSS, TS, TSX) outside the token file and tests. */
export function findDesignHits(files = sourceFiles()): DesignHit[] {
  return files.flatMap((absolute) => {
    const file = relative(process.cwd(), absolute);
    if (TOKEN_FILES.has(file) || !/^src\/.*\.(css|tsx?)$/.test(file) || /\.test\.tsx?$/.test(file)) return [];
    return hitsInText(file, readFileSync(absolute, "utf8"));
  });
}

export function countByFile(hits: readonly DesignHit[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const hit of hits) counts[hit.file] = (counts[hit.file] ?? 0) + 1;
  return counts;
}
