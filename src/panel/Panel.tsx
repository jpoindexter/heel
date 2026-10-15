import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { BrainSettings } from "../settings/BrainSettings";
import { TodayTab } from "../today/TodayTab";

const TABS = [
  { id: "today", label: "Today" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Panel() {
  const [tab, setTab] = useState<TabId>("today");
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ today: null, settings: null });

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") void invoke("toggle_panel_command");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Roving tabindex: the tab list is one Tab stop; arrows move within it.
  const onTabKey = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length]!.id;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <main className="panel">
      <header data-tauri-drag-region>
        <h1 data-tauri-drag-region>Heel</h1>
        <button type="button" className="button" onClick={() => void invoke("toggle_panel_command")} aria-label="Close panel">
          Close
        </button>
      </header>

      <div role="tablist" aria-label="Heel sections" className="tabs">
        {TABS.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => { tabRefs.current[item.id] = node; }}
            role="tab"
            id={`tab-${item.id}`}
            type="button"
            className="tab"
            aria-selected={tab === item.id}
            aria-controls={`tabpanel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => onTabKey(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Both tabs stay mounted and are only hidden, so a typed draft, the last reply and the open list survive a trip to Settings. */}
      <div role="tabpanel" id="tabpanel-today" aria-labelledby="tab-today" className="scroll" data-fill hidden={tab !== "today"}>
        <TodayTab active={tab === "today"} onOpenSettings={() => setTab("settings")} />
      </div>
      <div role="tabpanel" id="tabpanel-settings" aria-labelledby="tab-settings" className="scroll" hidden={tab !== "settings"}>
        <BrainSettings active={tab === "settings"} />
      </div>
    </main>
  );
}
