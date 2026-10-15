import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { HEEL_STATES, type HeelState } from "../mascot/atlas";
import { MOTION_EVENT } from "../events";

const STATE_LABELS: Record<HeelState, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  greeting: "Greeting",
  done: "Done",
  error: "Error",
};

// Spike-only panel: proves the panel opens, takes focus, and can drive the mascot across windows.
// The real task list + ask box is slice S2.
export function Panel() {
  return (
    <main className="panel">
      <header data-tauri-drag-region>
        <h1 data-tauri-drag-region>Heel</h1>
        <button type="button" onClick={() => void invoke("toggle_panel_command")} aria-label="Close panel">
          Close
        </button>
      </header>
      <p>Spike check: choose a mascot state.</p>
      <div className="states" role="group" aria-label="Mascot state">
        {(Object.keys(HEEL_STATES) as HeelState[]).map((state) => (
          <button key={state} type="button" onClick={() => void emit(MOTION_EVENT, HEEL_STATES[state])}>
            {STATE_LABELS[state]}
          </button>
        ))}
      </div>
    </main>
  );
}
