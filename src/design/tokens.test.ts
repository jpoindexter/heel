import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..");
const declared = new Set([...readFileSync(join(SRC, "design/tokens.css"), "utf8").matchAll(/(--(?:motion|ease)-[a-z-]+):/g)].map((m) => m[1]));

/** Every motion token a stylesheet reads must exist: a `var()` to nothing makes the whole transition invalid, silently. */
describe("motion tokens", () => {
  it("are declared in tokens.css wherever a stylesheet reads them", () => {
    const missing = readdirSync(SRC, { recursive: true })
      .map(String)
      .filter((file) => file.endsWith(".css"))
      .flatMap((file) => [...readFileSync(join(SRC, file), "utf8").matchAll(/var\((--(?:motion|ease)-[a-z-]+)\)/g)].map((m) => `${file}: ${m[1]}`))
      .filter((hit) => !declared.has(hit.split(": ")[1]!));
    expect(missing).toEqual([]);
  });
});
