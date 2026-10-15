import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { client } from "../api/default-client";
import { BrainSettings } from "../settings/BrainSettings";
import { useBrainSummary } from "../settings/useBrainSummary";
import { ChatView } from "../today/ChatView";

type View = "chat" | "settings";

export function Panel() {
  const [view, setView] = useState<View>("chat");
  const { summary, refresh: refreshSummary } = useBrainSummary(client, view);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void invoke("toggle_panel_command");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="panel">
      <header data-tauri-drag-region>
        {view === "chat" ? (
          <>
            <h1 data-tauri-drag-region>Heel</h1>
            <button
              type="button"
              className="model-chip"
              data-setup={summary?.kind === "setup" || undefined}
              aria-label={summary ? `AI: ${summary.label}. Change in Settings` : "Settings"}
              onClick={() => setView("settings")}
            >
              <span className="model-chip-label">{summary?.label ?? "Settings"}</span>
              <span aria-hidden="true">▾</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="button" onClick={() => setView("chat")}>← Back</button>
            <h1 data-tauri-drag-region>Settings</h1>
          </>
        )}
        <button type="button" className="button" onClick={() => void invoke("toggle_panel_command")} aria-label="Close panel">
          Close
        </button>
      </header>

      {/* Both views stay mounted and are only hidden, so a typed draft, the conversation and the open drawer survive a trip to Settings. */}
      <div className="scroll" data-fill hidden={view !== "chat"}>
        <ChatView active={view === "chat"} summary={summary} onOpenSettings={() => setView("settings")} />
      </div>
      <div className="scroll" hidden={view !== "settings"}>
        <BrainSettings active={view === "settings"} onSaved={() => void refreshSummary()} />
      </div>
    </main>
  );
}
