import { useEffect } from "react";
import { client } from "../api/default-client";
import { useDigest } from "../inbox/useInbox";
import { useMailStatus, useOpenMail, useReplyFlow } from "../inbox/useMail";
import { usePomodoro } from "../focus/usePomodoro";
import { useMethod } from "../ui/method";
import { useNotices } from "../ui/notices";
import { orderTasks } from "./method-model";
import { nowCard } from "./today-model";
import { useChatActions } from "./useChatActions";
import { useTasks } from "./useTasks";
import { useThread } from "./useThread";
import { useTodayFocus } from "./useTodayFocus";

/** Everything the Today screen shows: tasks, the conversation, the time-box and Gmail. */
export function useTodayState(active: boolean, reloadKey: number) {
  const tasks = useTasks(client, active);
  const notices = useNotices();
  const { method } = useMethod();
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
  const pomodoro = usePomodoro(client, { active, notify: notices.show });
  const working = focus.session !== null || (pomodoro.view?.state?.phase === "work" && !pomodoro.view.state.waiting);
  useEffect(() => notices.setFocusRunning(working), [working, notices]);
  const mail = useMailStatus(client, active);
  const digest = useDigest(client, refresh);
  const reply = useReplyFlow(client, tasks.showNotice);
  const openMail = useOpenMail(client, tasks.showNotice);
  return { tasks, thread, chat, ready, now: ready ? nowCard(orderTasks(ready.tasks, method.structure)) : null, focus, pomodoro, mail, digest, reply, openMail };
}
