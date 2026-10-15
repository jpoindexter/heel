import { describe, expect, it } from "vitest";
import { MAX_FILE_LINES, MAX_FUNCTION_LINES, findOffenders } from "./size-scan";
import { SIZE_ALLOWLIST } from "./size-allowlist";

const offenders = findOffenders();
const keyOf = (o: { file: string; name: string }) => `${o.file}::${o.name}`;

describe(`size limits (files <= ${MAX_FILE_LINES} lines, functions <= ${MAX_FUNCTION_LINES})`, () => {
  it("has no new file or function over a limit", () => {
    const fresh = offenders.filter((o) => !(keyOf(o) in SIZE_ALLOWLIST));
    expect(fresh.map((o) => `${o.kind} ${keyOf(o)} is ${o.lines} lines`), "split it, or (rarely) justify it in quality/size-allowlist.ts").toEqual([]);
  });

  it("lets no known offender grow", () => {
    const grown = offenders.filter((o) => keyOf(o) in SIZE_ALLOWLIST && o.lines > SIZE_ALLOWLIST[keyOf(o)]!);
    expect(grown.map((o) => `${keyOf(o)}: ${o.lines} > ${SIZE_ALLOWLIST[keyOf(o)]}`)).toEqual([]);
  });

  it("has no stale allowlist entries (paid-off debt must be deleted from the list)", () => {
    const current = new Set(offenders.map(keyOf));
    const stale = Object.keys(SIZE_ALLOWLIST).filter((key) => !current.has(key));
    expect(stale).toEqual([]);
  });
});
