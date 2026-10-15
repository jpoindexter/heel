import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { shouldBlockContextMenu } from "./context-menu";
import { Mascot } from "./mascot/Mascot";
import { Panel } from "./panel/Panel";
import "./design/base.css";

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

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{label === "panel" ? <Panel /> : <Mascot />}</React.StrictMode>,
);
