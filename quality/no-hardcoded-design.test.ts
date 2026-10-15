import { describe, expect, it } from "vitest";
import { countByFile, findDesignHits, hitsInText } from "./design-scan";
import { DESIGN_ALLOWLIST } from "./design-allowlist";

describe("design literals are caught", () => {
  it("flags hex and functional colours", () => {
    expect(hitsInText("a.css", "a { color: #1f2223; b: rgb(1 2 3); c: oklch(0.5 0 0); }").map((h) => h.kind)).toEqual(["color", "color", "color"]);
  });

  it("flags literal sizes and durations but not tokens, computed values, comments or media queries", () => {
    expect(hitsInText("a.css", "a { padding: 12px; transition: 150ms; }")).toHaveLength(2);
    expect(hitsInText("a.css", "a { padding: var(--space-3); width: calc(var(--space-2) * 2); }")).toHaveLength(0);
    expect(hitsInText("a.tsx", "const s = `${x}px`; // 12px in a comment")).toHaveLength(0);
    expect(hitsInText("a.css", "@media (min-width: 640px) { a { b: c } }")).toHaveLength(0);
  });
});

describe("no hard-coded design values (tokens only)", () => {
  const counts = countByFile(findDesignHits());

  it("has no new file with literals", () => {
    const fresh = Object.keys(counts).filter((file) => !(file in DESIGN_ALLOWLIST));
    expect(fresh.map((file) => `${file}: ${counts[file]} literals`), "use a token (Radix variable or src/design/tokens.css)").toEqual([]);
  });

  it("lets no known file gain literals", () => {
    const grown = Object.keys(DESIGN_ALLOWLIST).filter((file) => (counts[file] ?? 0) > DESIGN_ALLOWLIST[file]!);
    expect(grown.map((file) => `${file}: ${counts[file]} > ${DESIGN_ALLOWLIST[file]}`)).toEqual([]);
  });

  it("has no stale allowlist entries", () => {
    const stale = Object.keys(DESIGN_ALLOWLIST).filter((file) => !(file in counts));
    expect(stale).toEqual([]);
  });
});
