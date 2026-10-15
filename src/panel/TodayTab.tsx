import { emit } from "@tauri-apps/api/event";
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

/** Placeholder until slice S2 (task list + ask box). The buttons prove the panel can drive the mascot. */
export function TodayTab() {
  return (
    <section aria-labelledby="today-heading" className="section">
      <h2 id="today-heading">Today</h2>
      <p className="helper">Your task list and ask box arrive in the next slice. For now, try a mascot state.</p>
      <div className="states" role="group" aria-label="Mascot state">
        {(Object.keys(HEEL_STATES) as HeelState[]).map((state) => (
          <button key={state} type="button" className="button" onClick={() => void emit(MOTION_EVENT, HEEL_STATES[state])}>
            {STATE_LABELS[state]}
          </button>
        ))}
      </div>
    </section>
  );
}
