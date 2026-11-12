import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { logDebug } from "../ui/debug-log";
import { relaunch } from "@tauri-apps/plugin-process";

type Phase = "idle" | "checking" | "downloading" | "ready" | "installing" | "error";
export function useUpdates() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("Updates download automatically. You choose when to restart.");
  const pending = useRef<Update | null>(null), busy = useRef(false), installed = useRef(false);
  const checkNow = useCallback(async () => {
    if (!isTauri() || busy.current || pending.current) return;
    busy.current = true; setPhase("checking"); setMessage("Checking for updates…");
    let update: Update | null = null;
    try {
      update = await check({ timeout: 20_000 });
      if (!update) { setPhase("idle"); setMessage("Heel is up to date."); return; }
      setPhase("downloading"); setMessage(`Downloading Heel ${update.version}…`);
      let bytes = 0, total = 0;
      await update.download(event => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") {
          bytes += event.data.chunkLength;
          if (total) setMessage(`Downloading Heel ${update!.version} · ${Math.min(100, Math.round(bytes / total * 100))}%`);
        }
      }, { timeout: 120_000 });
      pending.current = update;
      setPhase("ready"); setMessage(`Heel ${update.version} is ready. Finish your work, then restart to update.`);
    } catch {
      await update?.close().catch(() => {});
      setPhase("error"); setMessage("Could not download a verified update. Your current version is still installed. Try again later.");
    } finally { busy.current = false; }
  }, []);
  const restart = async () => {
    if (busy.current || !pending.current) return;
    busy.current = true; setPhase("installing"); setMessage("Installing update and restarting…");
    try {
      if (!installed.current) { await pending.current.install(); installed.current = true; }
      await relaunch();
    } catch (error) {
      logDebug("error", "updater", String(error));
      if (!installed.current) {
        await pending.current.close().catch(() => {}); pending.current = null;
      }
      setPhase(installed.current ? "ready" : "error");
      setMessage(installed.current ? "Update installed. Restart Heel to finish." : "Could not install the update. Your current version is still installed. Check for updates to try again.");
    } finally { busy.current = false; }
  };
  useEffect(() => {
    void checkNow();
    const timer = window.setInterval(() => void checkNow(), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [checkNow]);
  return { phase, message, checkNow, restart };
}
export type Updates = ReturnType<typeof useUpdates>;
