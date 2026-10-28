import { PlusIcon, StopIcon } from "@radix-ui/react-icons";
import { IconButton, Text } from "@radix-ui/themes";
import { ActionTray } from "./ActionTray";
import { BAR_TRAY, type TrayAction } from "./bar-model";
import "./bar.css";

type Props = {
  /** A Low or Off day: no +, no quick actions; the pill stays. */
  chips: boolean;
  trayOpen: boolean;
  trayClosing: boolean;
  /** Heel is thinking: the pill says so and offers Stop. */
  thinking: boolean;
  emailReady: boolean;
  onToggleTray: () => void;
  onAction: (action: TrayAction) => void;
  onOpenChat: () => void;
  onStop: () => void;
};

/** The folded bar: + and one pill. + pushes four round buttons out across the bar in the pill's place. */
export function Bar({ chips, trayOpen, trayClosing, thinking, emailReady, onToggleTray, onAction, onOpenChat, onStop }: Props) {
  return (
    <div className="bar">
      {chips && (
        <IconButton type="button" size="3" radius="full" variant="soft" color="gray" className="plus" aria-label="More" aria-expanded={trayOpen} onClick={onToggleTray}>
          <PlusIcon aria-hidden="true" />
        </IconButton>
      )}
      {chips && trayOpen ? (
        <ActionTray actions={BAR_TRAY} closing={trayClosing} emailReady={emailReady} onAction={onAction} />
      ) : thinking ? (
        <div className="pill-row thinking">
          <Text size="2" color="gray" className="grow pulse">Heel is thinking…</Text>
          <IconButton type="button" size="1" radius="full" variant="solid" color="gray" highContrast aria-label="Stop" onClick={onStop}>
            <StopIcon aria-hidden="true" />
          </IconButton>
        </div>
      ) : (
        <button type="button" className="pill-row prompt" onClick={onOpenChat}>What's on your mind?</button>
      )}
    </div>
  );
}
