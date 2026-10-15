import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ArrowLeftIcon, ChevronDownIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Button, Heading, IconButton, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../design/tokens.css";
import "./panel.css";
import { client } from "../api/default-client";
import { OPEN_SETTINGS_EVENT } from "../events";
import { SettingsView } from "../settings/SettingsView";
import { useBrainSummary } from "../settings/useBrainSummary";
import { useAppearance } from "../theme/useAppearance";
import { ChatView } from "../today/ChatView";

type View = "chat" | "settings";

/** "Settings…" in the menu bar: ask once at start (the panel may have loaded after the click) and again on each event. */
function useOpenSettingsRequests(open: () => void): void {
  useEffect(() => {
    const showPending = async () => {
      try {
        if ((await invoke<string | null>("take_pending_view")) === "settings") open();
      } catch {
        /* outside Tauri (the ?window=panel preview) there is no shell to ask */
      }
    };
    void showPending();
    const unlisten = listen(OPEN_SETTINGS_EVENT, () => void showPending()).catch(() => undefined);
    return () => void unlisten.then((off) => off?.());
  }, [open]);
}

function useEscapeToClose(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void invoke("toggle_panel_command");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const closePanel = () => void invoke("toggle_panel_command");

function ChatHeader({ label, needsSetup, onSettings }: { label: string; needsSetup: boolean; onSettings: () => void }) {
  return (
    <>
      <Heading as="h1" size="4" data-tauri-drag-region className="grow">Heel</Heading>
      <Button
        variant="soft"
        color={needsSetup ? "amber" : "gray"}
        className="model-chip"
        aria-label={`AI: ${label}. Change in Settings`}
        onClick={onSettings}
      >
        <span className="model-chip-label">{label}</span>
        <ChevronDownIcon aria-hidden="true" />
      </Button>
    </>
  );
}

function SettingsHeader({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Button variant="soft" color="gray" onClick={onBack}>
        <ArrowLeftIcon aria-hidden="true" /> Back
      </Button>
      <Heading as="h1" size="4" data-tauri-drag-region className="grow">Settings</Heading>
    </>
  );
}

export function Panel() {
  const [view, setView] = useState<View>("chat");
  const { summary, refresh: refreshSummary } = useBrainSummary(client, view);
  const { preference, appearance, setPreference } = useAppearance();
  useEscapeToClose();
  useOpenSettingsRequests(() => setView("settings"));

  return (
    <Theme appearance={appearance} accentColor="jade" grayColor="sand" radius="small" panelBackground="solid" className="panel-theme">
      <main className="panel">
        <header data-tauri-drag-region className="panel-header">
          {view === "chat" ? (
            <ChatHeader label={summary?.label ?? "Settings"} needsSetup={summary?.kind === "setup"} onSettings={() => setView("settings")} />
          ) : (
            <SettingsHeader onBack={() => setView("chat")} />
          )}
          <IconButton variant="ghost" color="gray" aria-label="Close panel" onClick={closePanel}>
            <Cross2Icon aria-hidden="true" />
          </IconButton>
        </header>

        {/* Both views stay mounted and are only hidden, so a typed draft, the conversation and the open drawer survive a trip to Settings. */}
        <div className="view" data-fill hidden={view !== "chat"}>
          <ChatView active={view === "chat"} summary={summary} onOpenSettings={() => setView("settings")} />
        </div>
        <div className="view" hidden={view !== "settings"}>
          <SettingsView active={view === "settings"} onSaved={() => void refreshSummary()} preference={preference} onPreference={setPreference} />
        </div>
      </main>
    </Theme>
  );
}
