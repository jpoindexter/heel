import type { DebugInfoDto } from "../../shared/api";
import { APP_VERSION } from "../../shared/version";
import { formatLog, type DebugEntry } from "./debug-log";

export type ReportInput = {
  /** What the helper said about itself, or null when it could not be reached. */
  helper: DebugInfoDto | null;
  log: readonly DebugEntry[];
  /** The line the crash screen shows, when the report is made from there. */
  crash?: string | null;
  now?: Date;
};

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

function uptime(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  return hours > 0 ? `${hours} h ${minutes % MINUTES_PER_HOUR} min` : `${minutes} min`;
}

/** The helper's facts as "name: value" lines; a person reads these first. */
export function helperLines(helper: DebugInfoDto | null): string[] {
  if (!helper) return ["not reached (is it running? Settings shows a Restart when it is not)"];
  return [
    `port: ${helper.port ?? "unknown"}`,
    `up: ${uptime(helper.uptimeSec)}`,
    `data folder: ${helper.dataDir}`,
    `Node: ${helper.node}`,
    `database version: ${helper.migration}`,
    `brain: ${helper.provider ?? "none chosen"}`,
    `attention sense: ${helper.attention ? "on" : "off"}`,
    `tasks: ${helper.counts.tasks} · parked: ${helper.counts.parked} · documents: ${helper.counts.documents}`,
  ];
}

const osLine = (helper: DebugInfoDto | null): string => helper?.os ?? (typeof navigator === "undefined" ? "unknown OS" : navigator.platform || "unknown OS");

/**
 * One plain-text block a person can paste anywhere. By construction it only ever sees the log and /debug,
 * so no message, mail or task text can be in it.
 */
export function buildReport({ helper, log, crash = null, now = new Date() }: ReportInput): string {
  const lines = [`Heel ${APP_VERSION} · ${osLine(helper)} · ${now.toISOString()}`, ""];
  if (crash) lines.push("CRASH", crash, "");
  lines.push("HELPER", ...helperLines(helper), "");
  lines.push("PANEL LOG (newest last)", log.length ? formatLog(log) : "(empty)", "");
  lines.push("HELPER LOG (last lines)", helper ? helper.sidecarLog.join("\n") || "(empty)" : "(helper not reached)");
  return lines.join("\n");
}

/** Put text on the clipboard. The async API first; the old selection trick when a webview refuses it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return selectAndCopy(text);
  }
}

function selectAndCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  document.body.append(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
