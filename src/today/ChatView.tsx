import { Button, Callout } from "@radix-ui/themes";
import { FocusStatus } from "../focus/FocusStatus";
import type { BrainSummary } from "../settings/brain-summary";
import { Notifier } from "../ui/Notifier";
import { AgentView } from "./AgentView";
import "./chat.css";
import { TasksView } from "./TasksView";
import { useTodayState } from "./useTodayState";

export type Tab = "tasks" | "agent";

type Props = {
  /** Which screen shows; "settings" hides both (they stay mounted, so a draft or a half-typed task survives a trip to Settings). */
  view: Tab | "settings";
  onTab: (tab: Tab) => void;
  summary: BrainSummary | null;
  /** Changes when the helper came back from not running: reload what is shown. */
  reloadKey: number;
  onOpenSettings: () => void;
};

/** The two apps, Tasks and Agent, with a running time-box or its check-in above whichever is showing. */
export function ChatView({ view, onTab, summary, reloadKey, onOpenSettings }: Props) {
  const state = useTodayState(view !== "settings", reloadKey);
  const { tasks } = state;
  return (
    <div className="chat">
      {tasks.state.phase === "error" && (
        <Callout.Root color="amber" role="alert" size="1" highContrast>
          <Callout.Text>{tasks.state.message}</Callout.Text>
          <Button size="1" variant="soft" onClick={() => void tasks.refresh()}>Try again</Button>
        </Callout.Root>
      )}
      <FocusStatus focus={state.focus} />
      <div className="tab" hidden={view !== "tasks"}>
        <TasksView state={state} active={view === "tasks"} onNeedVisible={() => onTab("tasks")} />
      </div>
      <div className="tab" data-fill hidden={view !== "agent"}>
        <AgentView state={state} active={view === "agent"} summary={summary} onOpenSettings={onOpenSettings} />
      </div>
      <div className="compose-zone"><Notifier notice={tasks.notice} onDismiss={tasks.dismissNotice} /></div>
    </div>
  );
}
