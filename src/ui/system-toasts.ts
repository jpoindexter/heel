/** "Also show in Notification Center" (N3b): on unless the person turned it off. The panel writes it; the notices read it each time. */
export const SYSTEM_TOASTS_KEY = "heel:system-toasts";

export function systemToastsOn(): boolean {
  try {
    return window.localStorage.getItem(SYSTEM_TOASTS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSystemToasts(on: boolean): void {
  try {
    window.localStorage.setItem(SYSTEM_TOASTS_KEY, on ? "on" : "off");
  } catch {
    /* not remembered this time */
  }
}
