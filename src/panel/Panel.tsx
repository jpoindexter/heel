import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ArrowLeftIcon, Cross2Icon, GearIcon } from "@radix-ui/react-icons";
import { Button, Heading, IconButton, SegmentedControl, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../design/tokens.css";
import "./panel.css";
import { client } from "../api/default-client";
import { HelperNotice } from "../helper/HelperNotice";
import { useHelperStatus } from "../helper/useHelperStatus";
import { OPEN_SETTINGS_EVENT } from "../events";
import { shouldCloseOnKey } from "./escape";
import { usePanelAnchor } from "./usePanelAnchor";
import { SettingsView } from "../settings/SettingsView";
import { useBrainSummary } from "../settings/useBrainSummary";
import { SCALING } from "../theme/density";
import { useDensity } from "../theme/useDensity";
import { useAppearance } from "../theme/useAppearance";
import { ChatView, type Tab } from "../today/ChatView";

type View = Tab | "settings";

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
      if (shouldCloseOnKey(event)) void invoke("toggle_panel_command");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const closePanel = () => void invoke("toggle_panel_command");

/** Which screen is showing (Tasks, Agent or Settings) and which tab Back from Settings returns to. */
function usePanelView() {
  const [view, setView] = useState<View>("tasks");
  const [lastTab, setLastTab] = useState<Tab>("tasks");
  const goTab = useCallback((tab: Tab) => {
    setLastTab(tab);
    setView(tab);
  }, []);
  const openSettings = useCallback(() => setView("settings"), []);
  return { view, setView, lastTab, goTab, openSettings };
}

/** How the panel looks: light or dark, and how big. */
function usePanelLook() {
  const { preference, appearance, setPreference } = useAppearance();
  const [density, setDensity] = useDensity();
  return { preference, appearance, setPreference, density, setDensity };
}

function TabsHeader({ tab, onTab, onSettings }: { tab: Tab; onTab: (tab: Tab) => void; onSettings: () => void }) {
  return (
    <>
      <SegmentedControl.Root size="1" value={tab} onValueChange={(value) => (value === "tasks" || value === "agent") && onTab(value)} aria-label="Screen">
        <SegmentedControl.Item value="tasks">Tasks</SegmentedControl.Item>
        <SegmentedControl.Item value="agent">Agent</SegmentedControl.Item>
      </SegmentedControl.Root>
      <span data-tauri-drag-region className="grow" />
      <IconButton variant="ghost" color="gray" aria-label="Settings" onClick={onSettings}>
        <GearIcon aria-hidden="true" />
      </IconButton>
    </>
  );
}

function SettingsHeader({ onBack }: { onBack: () => void }) {
  return (
    <>
      <Button variant="ghost" color="gray" size="1" onClick={onBack}>
        <ArrowLeftIcon aria-hidden="true" /> Back
      </Button>
      <Heading as="h1" size="2" data-tauri-drag-region className="grow">Settings</Heading>
    </>
  );
}

export function Panel() {
  const { view, setView, lastTab, goTab, openSettings } = usePanelView();
  const { summary, refresh: refreshSummary } = useBrainSummary(client, view === "settings" ? "settings" : "chat");
  const look = usePanelLook();
  const [anchor, helper] = [usePanelAnchor(), useHelperStatus(() => void refreshSummary())];
  useEscapeToClose();
  useOpenSettingsRequests(openSettings);

  return (
    <Theme
      appearance={look.appearance}
      accentColor="jade"
      grayColor="sand"
      radius="small"
      scaling={SCALING[look.density]}
      panelBackground="solid"
      hasBackground={false}
      className="panel-theme"
      data-tail={anchor.edge}
      style={{ "--tail-x": `${anchor.offset}px` } as CSSProperties}
    >
      <main className="panel">
        <span className="panel-tail" aria-hidden="true" />
        <header data-tauri-drag-region className="panel-header">
          {view === "settings" ? <SettingsHeader onBack={() => setView(lastTab)} /> : <TabsHeader tab={view} onTab={goTab} onSettings={openSettings} />}
          <IconButton variant="ghost" color="gray" aria-label="Close panel" onClick={closePanel}>
            <Cross2Icon aria-hidden="true" />
          </IconButton>
        </header>

        <HelperNotice status={helper.status} error={helper.error} onRestart={() => void helper.restart()} />

        {/* Both screens stay mounted and are only hidden, so a draft, the conversation and a half-typed task survive a trip to Settings. */}
        <div className="view" data-fill hidden={view === "settings"}>
          <ChatView view={view} onTab={goTab} summary={summary} reloadKey={helper.recoveries} onOpenSettings={openSettings} />
        </div>
        <div className="view" hidden={view !== "settings"}>
          <SettingsView
            active={view === "settings"}
            onSaved={() => void refreshSummary()}
            preference={look.preference}
            onPreference={look.setPreference}
            density={look.density}
            onDensity={look.setDensity}
          />
        </div>
      </main>
    </Theme>
  );
}
