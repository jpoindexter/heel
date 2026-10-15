import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import ts from "typescript";

/** Hard limits (CLAUDE.md: files 300 hard / 200 soft, functions 50 hard / 30 soft). Soft limits are reported, not enforced. */
export const MAX_FILE_LINES = 300;
export const SOFT_FILE_LINES = 200;
export const MAX_FUNCTION_LINES = 50;

const ROOT = join(import.meta.dirname, "..");
const SCAN_DIRS = ["src", "sidecar", "shared", "src-tauri/src", "quality"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".css", ".rs"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "target", "skills"]);

export type Offender = { file: string; kind: "file" | "function"; name: string; lines: number };

export function sourceFiles(dir = ROOT): string[] {
  const found: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current)) {
      if (SKIP_DIRS.has(entry)) continue;
      const path = join(current, entry);
      if (statSync(path).isDirectory()) visit(path);
      else if (SOURCE_EXTENSIONS.has(extname(path))) found.push(path);
    }
  };
  for (const scanDir of SCAN_DIRS) {
    const path = join(dir, scanDir);
    try {
      visit(path);
    } catch {
      /* a scan dir that doesn't exist yet */
    }
  }
  return found.sort();
}

const isTest = (file: string) => /\.test\.(ts|tsx)$/.test(file);

function lineCount(text: string): number {
  return text === "" ? 0 : text.replace(/\n$/, "").split("\n").length;
}

/** Function-like nodes in a TS/TSX file, with their size in lines. Test bodies (describe/it callbacks) are not judged. */
function tsFunctions(file: string, text: string): Offender[] {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const out: Offender[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const start = source.getLineAndCharacterOfPosition(node.getStart()).line;
      const end = source.getLineAndCharacterOfPosition(node.getEnd()).line;
      const parent = node.parent;
      const name =
        (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name
          ? node.name.getText()
          : ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)
            ? parent.name.getText()
            : `anonymous@${start + 1}`;
      out.push({ file, kind: "function", name, lines: end - start + 1 });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

/** Rust `fn` items by brace matching (good enough for this codebase's formatting). */
function rustFunctions(file: string, text: string): Offender[] {
  const lines = text.split("\n");
  const out: Offender[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i]!.match(/^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)/);
    if (!match) continue;
    let depth = 0;
    let opened = false;
    for (let j = i; j < lines.length; j += 1) {
      for (const char of lines[j]!) {
        if (char === "{") {
          depth += 1;
          opened = true;
        } else if (char === "}") depth -= 1;
      }
      if (opened && depth === 0) {
        out.push({ file, kind: "function", name: match[1]!, lines: j - i + 1 });
        break;
      }
    }
  }
  return out;
}

/** Everything over a hard limit, with repo-relative paths. */
export function findOffenders(files = sourceFiles()): Offender[] {
  const offenders: Offender[] = [];
  for (const absolute of files) {
    const file = relative(ROOT, absolute);
    const text = readFileSync(absolute, "utf8");
    const lines = lineCount(text);
    if (lines > MAX_FILE_LINES) offenders.push({ file, kind: "file", name: file, lines });
    if (isTest(file)) continue;
    const functions = file.endsWith(".rs") ? rustFunctions(file, text) : file.endsWith(".ts") || file.endsWith(".tsx") ? tsFunctions(file, text) : [];
    for (const fn of functions) if (fn.lines > MAX_FUNCTION_LINES) offenders.push(fn);
  }
  return offenders;
}

export function softOffenders(files = sourceFiles()): Offender[] {
  return files
    .map((absolute) => ({ file: relative(ROOT, absolute), lines: lineCount(readFileSync(absolute, "utf8")) }))
    .filter((f) => f.lines > SOFT_FILE_LINES && f.lines <= MAX_FILE_LINES)
    .map((f) => ({ file: f.file, kind: "file" as const, name: f.file, lines: f.lines }));
}
