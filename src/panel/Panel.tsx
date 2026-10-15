import { useEffect, useRef, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../design/tokens.css";
import "./panel.css";
import { client } from "../api/default-client";
import { HelperNotice } from "../helper/HelperNotice";
import { useHelperStatus } from "../helper/useHelperStatus";
import { useActivity } from "../mascot/life/useActivity";
import { OPEN_SETTINGS_EVENT } from "../events";
import { Notifier } from "../ui/Notifier";
import { NoticesProvider, useNotices } from "../ui/notices";
import { LayersProvider, useLayers, type Layers } from "../ui/layers";
import { AttentionProvider } from "../ui/attention";
import { MethodProvider } from "../ui/method";
import { useSwipe } from "../ui/useSwipe";
import { shouldCloseOnKey } from "./escape";
import { PanelHeader } from "./PanelHeader";
import { usePanelAnchor } from "./usePanelAnchor";
import { SettingsView } from "../settings/SettingsView";
import { useBrainSummary } from "../settings/useBrainSummary";
import { SCALING } from "../theme/density";
import { useDensity } from "../theme/useDensity";
import { useAppearance } from "../theme/useAppearance";
import { TodayView } from "../today/TodayView";

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

/** Esc goes back one layer; at the root it closes the panel. A control that used Esc itself (a menu, the chat card) keeps it. */
function useEscape(layers: Layers): void {
  const latest = useRef(layers);
  latest.current = layers;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!shouldCloseOnKey(event)) return;
      if (latest.current.top === "today") void invoke("toggle_panel_command");
      else latest.current.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const closePanel = () => void invoke("toggle_panel_command");

/** How the panel looks: light or dark, and how big. */
function usePanelLook() {
  const { preference, appearance, setPreference } = useAppearance();
  const [density, setDensity] = useDensity();
  return { preference, appearance, setPreference, density, setDensity };
}

/** The toast lives at the panel level: every layer's notices drop in from the same top edge. */
function PanelToast() {
  const notices = useNotices();
  return <Notifier notice={notices.notice} onDismiss={notices.dismiss} onHold={notices.hold} onRelease={notices.release} />;
}

function PanelBody({ look }: { look: ReturnType<typeof usePanelLook> }) {
  const layers = useLayers();
  const inSettings = layers.top === "settings";
  const { summary, refresh: refreshSummary } = useBrainSummary(client, inSettings ? "settings" : "chat");
  const notices = useNotices();
  const helper = useHelperStatus((from) => {
    void refreshSummary();
    if (from !== "starting") notices.show({ message: "Heel's helper is back", tone: "info" });
  });
  useEscape(layers);
  useOpenSettingsRequests(() => layers.push("settings"));
  const onWheel = useSwipe();

  return (
    <main className="panel" onWheel={onWheel}>
      <span className="panel-tail" aria-hidden="true" />
      <PanelHeader onClose={closePanel} />
      <HelperNotice status={helper.status} error={helper.error} onRestart={() => void helper.restart()} />
      <TodayView
        showing={layers.top === "today"}
        summary={summary}
        reloadKey={helper.recoveries}
        settings={
          <SettingsView
            active={inSettings}
            onSaved={() => void refreshSummary()}
            preference={look.preference}
            onPreference={look.setPreference}
            density={look.density}
            onDensity={look.setDensity}
          />
        }
      />
      <PanelToast />
    </main>
  );
}

export function Panel() {
  const look = usePanelLook();
  const [activity] = useActivity();
  const anchor = usePanelAnchor();

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
      <NoticesProvider quiet={activity === "off"}>
        <LayersProvider>
          <MethodProvider client={client}>
            <AttentionProvider client={client}>
              <PanelBody look={look} />
            </AttentionProvider>
          </MethodProvider>
        </LayersProvider>
      </NoticesProvider>
    </Theme>
  );
}
