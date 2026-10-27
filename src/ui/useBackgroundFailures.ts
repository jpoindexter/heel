import { useEffect } from "react";
import { backgroundFailureNotice } from "./crash-model";
import type { Notices } from "./notices";

/** A promise nobody awaited, or an error outside React: say so in the usual toast instead of failing silently. */
export function useBackgroundFailures(notices: Pick<Notices, "show">): void {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      console.error("[heel:panel] unhandled rejection:", event.reason);
      notices.show({ message: backgroundFailureNotice(event.reason), tone: "error" });
    };
    const onError = (event: ErrorEvent) => {
      console.error("[heel:panel] uncaught error:", event.error ?? event.message);
      notices.show({ message: backgroundFailureNotice(event.error ?? event.message), tone: "error" });
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, [notices]);
}
