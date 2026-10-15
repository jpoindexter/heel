import { Bar } from "./Bar";
import { Compose } from "./Compose";
import type { useBarActions } from "./useBarActions";
import type { useTodayState } from "./useTodayState";

type Props = {
  state: ReturnType<typeof useTodayState>;
  bar: ReturnType<typeof useBarActions>;
  showing: boolean;
  focusSignal: number;
  emailReady: boolean;
};

/** The bottom of the panel: the open chat card, or the folded bar with + and one pill. */
export function BottomBar({ state, bar, showing, focusSignal, emailReady }: Props) {
  const { thread, chat } = state;
  if (bar.composerOpen) {
    return (
      <Compose
        active={showing}
        focusSignal={focusSignal}
        draft={chat.draft}
        thinking={thread.busy}
        trayOpen={bar.trayOpen}
        trayClosing={bar.trayClosing}
        emailReady={emailReady}
        onDraft={chat.setDraft}
        onSend={bar.send}
        onAdd={bar.add}
        onClose={bar.close}
        onStop={thread.stop}
        onToggleTray={bar.toggleTray}
        onAction={bar.onAction}
        onFocus={bar.cancelCollapse}
        onBlur={bar.onBlur}
      />
    );
  }
  return (
    <Bar
      trayOpen={bar.trayOpen}
      trayClosing={bar.trayClosing}
      thinking={thread.busy}
      emailReady={emailReady}
      onToggleTray={bar.toggleTray}
      onAction={bar.onAction}
      onOpenChat={bar.openComposer}
      onStop={thread.stop}
    />
  );
}
