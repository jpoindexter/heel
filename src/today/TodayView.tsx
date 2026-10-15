import { Button, Callout } from "@radix-ui/themes";
import { FocusStatus } from "../focus/FocusStatus";
import { InboxPanel } from "../inbox/InboxPanel";
import type { BrainSummary } from "../settings/brain-summary";
import { Notifier } from "../ui/Notifier";
import "./chat.css";
import { FirstRun } from "./FirstRun";
import { Reply } from "./Reply";
import { TaskSection } from "./TaskSection";
import { BottomBar } from "./BottomBar";
import { useBarActions } from "./useBarActions";
import { useNewTaskFocus } from "./useNewTaskShortcut";
import { useTodayState } from "./useTodayState";

type Props = {
  /** Settings hides this screen; it stays mounted, so a draft and the reply survive a trip there. */
  showing: boolean;
  /** Bring the person back from Settings. */
  onShow: () => void;
  summary: BrainSummary | null;
  /** Changes when the helper came back from not running: reload what is shown. */
  reloadKey: number;
  onOpenSettings: () => void;
};

/** The whole panel body: the latest reply, the tasks, and the bar at the bottom. Nothing else to learn. */
export function TodayView({ showing, onShow, summary, reloadKey, onOpenSettings }: Props) {
  const state = useTodayState(showing, reloadKey);
  const { tasks, thread } = state;
  const bar = useBarActions(state, onOpenSettings);
  const focusSignal = useNewTaskFocus(onShow, bar.openComposer);
  const emailReady = state.inbox.status?.connected ?? false;

  return (
    <div className="today" onPointerDownCapture={bar.onPointerOutside}>
      {tasks.state.phase === "error" && (
        <Callout.Root color="amber" role="alert" size="1" highContrast>
          <Callout.Text>{tasks.state.message}</Callout.Text>
          <Button size="1" variant="soft" onClick={() => void tasks.refresh()}>Try again</Button>
        </Callout.Root>
      )}
      <FocusStatus focus={state.focus} />
      <Reply
        messages={thread.messages}
        onRetry={thread.retry}
        onOpenSettings={onOpenSettings}
        onUndo={(id, index) => void thread.undoReceipt(id, index)}
        onDismiss={() => void thread.clear()}
      />
      <div className="today-scroll">
        <TaskSection state={state} />
        <InboxPanel digest={state.digest} />
      </div>
      {summary?.kind === "setup" && <FirstRun summary={summary} onOpenSettings={onOpenSettings} />}
      <div className="compose-zone"><Notifier notice={tasks.notice} onDismiss={tasks.dismissNotice} /></div>
      <BottomBar state={state} bar={bar} showing={showing} focusSignal={focusSignal} emailReady={emailReady} />
    </div>
  );
}
