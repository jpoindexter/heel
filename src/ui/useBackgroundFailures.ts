import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { backgroundFailureNotice, crashLine, isBenignBackgroundError } from "./crash-model";
import { logDebug } from "./debug-log";
import type { Notices } from "./notices";

/** A promise nobody awaited, or an error outside React: say so in the usual toast instead of failing silently, and note it in the debug log. */
export function useBackgroundFailures(notices: Pick<Notices, "show">) {
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => {
    const report = () => setReportOpen(true);
    const failed = (message: string) => notices.show({ message, tone: "error", choices: [{ label: "Report", run: report }] });
    if (isTauri()) void invoke<boolean>("previous_session_failed").then(previous => {
      if (previous) report();
    }).catch(() => {});
    const onRejection = (event: PromiseRejectionEvent) => {
      console.error("[heel:panel] unhandled rejection:", event.reason);
      logDebug("error", "panel", `unhandled rejection: ${crashLine(event.reason)}`);
      failed(backgroundFailureNotice(event.reason));
    };
    const onError = (event: ErrorEvent) => {
      if (isBenignBackgroundError(event.error ?? event.message)) return;
      console.error("[heel:panel] uncaught error:", event.error ?? event.message);
      logDebug("error", "panel", `uncaught error: ${crashLine(event.error ?? event.message)}`);
      failed(backgroundFailureNotice(event.error ?? event.message));
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, [notices]);
  return { reportOpen, setReportOpen };
}
