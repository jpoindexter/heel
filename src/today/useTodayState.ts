import { useEffect } from "react";
import { client } from "../api/default-client";
import { useDigest } from "../inbox/useInbox";
import { useMailStatus, useOpenMail, useReplyFlow } from "../inbox/useMail";
import { useNotices } from "../ui/notices";
import { nowCard } from "./today-model";
import { useChatActions } from "./useChatActions";
import { useTasks } from "./useTasks";
import { useThread } from "./useThread";
import { useTodayFocus } from "./useTodayFocus";

/** Everything the Today screen shows: tasks, the conversation, the time-box and Gmail. */
export function useTodayState(active: boolean, reloadKey: number) {
  const tasks = useTasks(client, active);
  const notices = useNotices();
  const thread = useThread(client, {
    onChanged: tasks.refresh,
    notify: (message) => tasks.showNotice(message, "error"),
    onCleared: (undo) => tasks.showNotice("Conversation cleared", "info", undo),
    onAnswered: (notice) => notices.show(notice, { whenHidden: true }),
  });
  const chat = useChatActions({ thread, tasks });
  const { refresh } = tasks;
  useEffect(() => {
    if (reloadKey > 0) void refresh();
  }, [reloadKey, refresh]);

  const ready = tasks.state.phase === "ready" ? tasks.state : null;
  const focus = useTodayFocus(client, active, tasks, ready);
  useEffect(() => notices.setFocusRunning(focus.session !== null), [focus.session, notices]);
  const mail = useMailStatus(client, active);
  const digest = useDigest(client, refresh);
  const reply = useReplyFlow(client, tasks.showNotice);
  const openMail = useOpenMail(client, tasks.showNotice);
  return { tasks, thread, chat, ready, now: ready ? nowCard(ready.tasks) : null, focus, mail, digest, reply, openMail };
}
