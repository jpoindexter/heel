import { BookmarkIcon, ChatBubbleIcon, CheckboxIcon, EnvelopeClosedIcon, ListBulletIcon, TargetIcon } from "@radix-ui/react-icons";
import { Tooltip } from "@radix-ui/themes";
import type { CSSProperties } from "react";
import { TRAY_LABEL, TRAY_NAME, rollOrder, type TrayAction } from "./bar-model";

type Props = {
  actions: readonly TrayAction[];
  /** Rolling back: the buttons leave last-to-first. */
  closing: boolean;
  /** Gmail is not connected: Email is dimmed and says where to connect it. */
  emailReady: boolean;
  onAction: (action: TrayAction) => void;
};

function Icon({ action }: { action: TrayAction }) {
  switch (action) {
    case "plan": return <ListBulletIcon aria-hidden="true" />;
    case "stuck": return <TargetIcon aria-hidden="true" />;
    case "email": return <EnvelopeClosedIcon aria-hidden="true" />;
    case "chat": return <ChatBubbleIcon aria-hidden="true" />;
    case "add": return <CheckboxIcon aria-hidden="true" />;
    case "park": return <BookmarkIcon aria-hidden="true" />;
  }
}

/** Four round buttons spread across the bar, rolling out of + one after another (and back again when one is picked). Each shows its name on hover and on keyboard focus. */
export function ActionTray({ actions, closing, emailReady, onAction }: Props) {
  return (
    <div className="tray" role="group" aria-label="Actions" data-closing={closing || undefined}>
      {actions.map((action, index) => {
        const dim = action === "email" && !emailReady;
        return (
          <Tooltip key={action} content={TRAY_NAME[action]}>
            <button
              type="button"
              className="round-button"
              style={{ "--i": rollOrder(index, actions.length, closing) } as CSSProperties}
              data-dim={dim || undefined}
              aria-label={dim ? "Email: connect Gmail in Settings" : TRAY_LABEL[action]}
              onClick={() => onAction(action)}
            >
              <Icon action={action} />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
