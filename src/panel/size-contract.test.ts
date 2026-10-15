import { describe, expect, it } from "vitest";
import panelSizeRs from "../../src-tauri/src/panel_size.rs?raw";
import tauriConf from "../../src-tauri/tauri.conf.json";

function rustPair(name: string): [number, number] {
  const match = panelSizeRs.match(new RegExp(`${name}: \\(f64, f64\\) = \\(([\\d.]+), ([\\d.]+)\\)`));
  if (!match) throw new Error(`${name} not found in panel_size.rs`);
  return [Number(match[1]), Number(match[2])];
}

describe("panel size limits", () => {
  const panel = tauriConf.app.windows.find((w) => w.label === "panel");

  it("are the same in Rust (used for the remembered size) and tauri.conf.json (enforced by the OS)", () => {
    expect(panel).toBeDefined();
    expect(rustPair("MIN_SIZE")).toEqual([panel?.minWidth, panel?.minHeight]);
    expect(rustPair("MAX_SIZE")).toEqual([panel?.maxWidth, panel?.maxHeight]);
  });

  it("let the panel be resized, and keep the default size inside the limits", () => {
    expect(panel?.resizable).toBe(true);
    const [minW, minH] = rustPair("MIN_SIZE");
    const [maxW, maxH] = rustPair("MAX_SIZE");
    expect(panel?.width).toBeGreaterThanOrEqual(minW);
    expect(panel?.width).toBeLessThanOrEqual(maxW);
    expect(panel?.height).toBeGreaterThanOrEqual(minH);
    expect(panel?.height).toBeLessThanOrEqual(maxH);
  });
});
