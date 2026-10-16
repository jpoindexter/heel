import { afterEach, describe, expect, it } from "vitest";
import { SYSTEM_TOASTS_KEY, setSystemToasts, systemToastsOn } from "./system-toasts";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "window", { value: { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } }, configurable: true });
afterEach(() => store.clear());

describe("system toasts", () => {
  it("are on until the person turns them off, and the switch is remembered", () => {
    expect(systemToastsOn()).toBe(true);
    setSystemToasts(false);
    expect(store.get(SYSTEM_TOASTS_KEY)).toBe("off");
    expect(systemToastsOn()).toBe(false);
    setSystemToasts(true);
    expect(systemToastsOn()).toBe(true);
  });
});
