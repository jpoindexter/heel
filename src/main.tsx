import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { shouldBlockContextMenu } from "./context-menu";
import { Mascot } from "./mascot/Mascot";
import { Panel } from "./panel/Panel";
import "./styles.css";

const label = getCurrentWindow().label;

window.addEventListener("contextmenu", (event) => {
  if (shouldBlockContextMenu(event.target as HTMLElement | null)) event.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{label === "panel" ? <Panel /> : <Mascot />}</React.StrictMode>,
);
