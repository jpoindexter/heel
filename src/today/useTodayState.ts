import { useEffect } from "react";
import { client } from "../api/default-client";
import { useDigest, useInboxConnection } from "../inbox/useInbox";
import { nowCard } from "./today-model";
import { useChatActions } from "./useChatActions";
import { useTasks } from "./useTasks";
import { useThread } from "./useThread";
import { useTodayFocus } from "./useTodayFocus";

/** Everything the Today screen shows: tasks, the conversation, the time-box and Gmail. */
export function useTodayState(active: boolean, reloadKey: number) {
  const tasks = useTasks(client, active);
  const thread = useThread(client, {
    onChanged: tasks.refresh,
    notify: (message) => tasks.showNotice(message, "error"),
    onCleared: (undo) => tasks.showNotice("Conversation cleared", "info", undo),
  });
  const chat = useChatActions({ thread, tasks });
  const { refresh } = tasks;
  useEffect(() => {
    if (reloadKey > 0) void refresh();
  }, [reloadKey, refresh]);

  const ready = tasks.state.phase === "ready" ? tasks.state : null;
  const focus = useTodayFocus(client, active, tasks, ready);
  const inbox = useInboxConnection(client, active);
  const digest = useDigest(client, refresh);
  return { tasks, thread, chat, ready, now: ready ? nowCard(ready.tasks) : null, focus, inbox, digest };
}
