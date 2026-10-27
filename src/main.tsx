import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { shouldBlockContextMenu } from "./context-menu";
import { Mascot } from "./mascot/Mascot";
import { NoticeBubble } from "./notice/NoticeBubble";
import { Panel } from "./panel/Panel";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import "./design/base.css";
import "./design/motion.css";

/** Which window this is. In `npm run dev` a plain browser can preview the panel with ?window=panel. */
function windowLabel(): string {
  if (import.meta.env.DEV) {
    const preview = new URLSearchParams(window.location.search).get("window");
    if (preview) return preview;
  }
  return getCurrentWindow().label;
}

const label = windowLabel();

window.addEventListener("contextmenu", (event) => {
  if (shouldBlockContextMenu(event.target as HTMLElement | null)) event.preventDefault();
});

const view = label === "panel" ? <Panel /> : label === "notice" ? <NoticeBubble /> : <Mascot />;

// A crash in one window must never leave it blank: each root has its own recovery screen.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary name={label}>{view}</ErrorBoundary>
  </React.StrictMode>,
);
