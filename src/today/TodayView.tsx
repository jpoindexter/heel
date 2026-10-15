import { useCallback, useEffect, type ReactNode } from "react";
import { Button, Callout } from "@radix-ui/themes";
import { FocusStatus } from "../focus/FocusStatus";
import { InboxPanel } from "../inbox/InboxPanel";
import type { BrainSummary } from "../settings/brain-summary";
import { Layer, LayerHost, useLayers } from "../ui/layers";
import "./chat.css";
import { FirstRun } from "./FirstRun";
import { Reply } from "./Reply";
import { ReplyRow } from "./ReplyRow";
import { TaskSection } from "./TaskSection";
import { BottomBar } from "./BottomBar";
import { useBarActions } from "./useBarActions";
import { useNewTaskFocus } from "./useNewTaskShortcut";
import { useTodayState } from "./useTodayState";

type Props = {
  /** Today is the base; it is "showing" when no layer is over it. */
  showing: boolean;
  summary: BrainSummary | null;
  /** Changes when the helper came back from not running: reload what is shown. */
  reloadKey: number;
  /** The Settings screen, which slides in over the tasks as a layer. */
  settings: ReactNode;
};

type State = ReturnType<typeof useTodayState>;

/** A sent question opens the reply layer; closing the email digest closes its layer. */
function useLayerFollows(state: State) {
  const { thread, digest } = state;
  const { push, back, top } = useLayers();
  useEffect(() => {
    if (thread.busy) push("reply");
  }, [thread.busy, push]);
  useEffect(() => {
    if (digest.state.phase === "idle" && top === "email") back();
  }, [digest.state.phase, top, back]);
}

/** The whole panel body: the tasks as the base, Settings / Email / the reply as layers over them, and the one bar at the bottom. */
export function TodayView({ showing, summary, reloadKey, settings }: Props) {
  const layers = useLayers();
  const state = useTodayState(showing, reloadKey);
  const { tasks, thread } = state;
  const openSettings = useCallback(() => layers.push("settings"), [layers]);
  const bar = useBarActions(state);
  const focusSignal = useNewTaskFocus(layers.home, bar.openComposer);
  useLayerFollows(state);

  return (
    <div className="today" onPointerDownCapture={bar.onPointerOutside}>
      {tasks.state.phase === "error" && (
        <Callout.Root color="amber" role="alert" size="1" highContrast>
          <Callout.Text>{tasks.state.message}</Callout.Text>
          <Button size="1" variant="soft" onClick={() => void tasks.refresh()}>Try again</Button>
        </Callout.Root>
      )}
      <FocusStatus focus={state.focus} />
      <LayerHost
        base={
          <div className="today-scroll">
            <ReplyRow messages={thread.messages} onOpen={() => layers.push("reply")} />
            <TaskSection state={state} />
          </div>
        }
      >
        <Layer name="settings" label="Settings">{settings}</Layer>
        <Layer name="email" label="Email">
          <InboxPanel digest={state.digest} reply={state.reply} onOpen={(id) => void state.openMail(id)} />
        </Layer>
        <Layer name="reply" label="Reply">
          <Reply
            messages={thread.messages}
            onRetry={thread.retry}
            onOpenSettings={openSettings}
            onUndo={(id, index) => void thread.undoReceipt(id, index)}
            onDismiss={() => {
              void thread.clear();
              layers.back();
            }}
          />
        </Layer>
      </LayerHost>
      {summary?.kind === "setup" && <FirstRun summary={summary} onOpenSettings={openSettings} />}
      <BottomBar state={state} bar={bar} showing={showing} focusSignal={focusSignal} emailReady={state.mail.available} />
    </div>
  );
}
