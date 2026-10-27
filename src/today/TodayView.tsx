import { useCallback, useEffect, type ReactNode } from "react";
import { Button, Callout } from "@radix-ui/themes";
import { FocusStatus } from "../focus/FocusStatus";
import { InboxPanel } from "../inbox/InboxPanel";
import type { BrainSummary } from "../settings/brain-summary";
import { Layer, LayerHost, useLayers } from "../ui/layers";
import "./chat.css";
import { DoneRow } from "./DoneRow";
import { FirstRun } from "./FirstRun";
import { HistoryLayer } from "./HistoryLayer";
import { Reply } from "./Reply";
import { ReplyRow } from "./ReplyRow";
import { SearchLayer } from "./SearchLayer";
import { TaskSection } from "./TaskSection";
import { BottomBar } from "./BottomBar";
import { useBarActions } from "./useBarActions";
import { todayKey } from "./history-labels";
import { useAttention } from "./useAttention";
import { useHistoryLayer } from "./useHistoryLayer";
import { useNewTaskFocus } from "./useNewTaskShortcut";
import { useSearchLayer } from "./useSearchLayer";
import { useDocuments } from "./useDocuments";
import { client } from "../api/default-client";
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

type ReplyLayerProps = { thread: State["thread"]; onOpenSettings: () => void; onOpenDocument: (id: string, file: "md" | "pdf") => void; onOpenMail: (messageId: string) => void; onClosed: () => void };

/** The latest exchange in its layer; closing it clears the conversation (with Undo) and pops the layer. */
function ReplyLayer({ thread, onOpenSettings, onOpenDocument, onOpenMail, onClosed }: ReplyLayerProps) {
  return (
    <Reply
      messages={thread.messages}
      onRetry={thread.retry}
      onOpenSettings={onOpenSettings}
      onOpenDocument={onOpenDocument}
      onOpenMail={onOpenMail}
      onConfirm={(id, index) => void thread.confirmReceipt(id, index)}
      onUndo={(id, index) => void thread.undoReceipt(id, index)}
      onDismiss={() => {
        void thread.clear();
        onClosed();
      }}
    />
  );
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
  const history = useHistoryLayer(tasks, layers);
  const documents = useDocuments(client, { active: layers.top === "history", notify: tasks.showNotice });
  const found = useSearchLayer({ state, layers, history, openDocument: documents.open });
  useAttention({ state, bar, layers });

  return (
    <div className="today" onPointerDownCapture={bar.onPointerOutside}>
      {tasks.state.phase === "error" && (
        <Callout.Root color="amber" role="alert" size="1" highContrast>
          <Callout.Text>{tasks.state.message}</Callout.Text>
          <Button size="1" variant="soft" onClick={() => void tasks.refresh()}>Try again</Button>
        </Callout.Root>
      )}
      <FocusStatus focus={state.focus} pomodoro={state.pomodoro} onTaskDone={(id) => { const task = state.ready?.tasks.find((t) => t.id === id); if (task) void tasks.complete(task); }} />
      <LayerHost
        base={
          <div className="today-scroll">
            <ReplyRow messages={thread.messages} onOpen={() => layers.push("reply")} />
            <TaskSection state={state} foundId={found.foundId} />
            {state.ready && <DoneRow doneToday={state.ready.doneToday} onOpen={() => layers.push("history")} />}
          </div>
        }
      >
        <Layer name="settings" label="Settings">{settings}</Layer>
        <Layer name="history" label="History">
          <HistoryLayer history={history} documents={documents} today={todayKey()} />
        </Layer>
        <Layer name="email" label="Email">
          <InboxPanel digest={state.digest} reply={state.reply} onOpen={(id) => void state.openMail(id)} />
        </Layer>
        <Layer name="reply" label="Reply" fill>
          <ReplyLayer thread={thread} onOpenSettings={openSettings} onOpenDocument={(id, file) => void documents.open(id, { file })} onOpenMail={(id) => void state.openMail(id)} onClosed={layers.back} />
        </Layer>
        <Layer name="search" label="Search">
          <SearchLayer search={found.search} active={layers.top === "search"} onPick={(hit) => void found.onPick(hit)} onAsk={found.onAsk} />
        </Layer>
      </LayerHost>
      {summary?.kind === "setup" && <FirstRun summary={summary} onOpenSettings={openSettings} />}
      <BottomBar state={state} bar={bar} showing={showing} focusSignal={focusSignal} emailReady={state.mail.available} />
    </div>
  );
}
