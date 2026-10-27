import { Button, Text } from "@radix-ui/themes";
import type { HistoryDto } from "../../shared/api";
import "./history.css";
import { useEffect } from "react";
import { useAttentionSettings } from "../ui/attention";
import { dayLabel, weekdayLetter } from "./history-labels";
import { hoursText } from "./jar-model";
import { DocumentsList } from "./DocumentsList";
import type { useDocuments } from "./useDocuments";
import type { useHistory } from "./useHistory";

/** Where the day went, as plain minutes per app, only while attention sense is on and has seen something. */
function DayWent() {
  const { settings, day, reloadDay } = useAttentionSettings();
  useEffect(() => void reloadDay(), [reloadDay]);
  if (!settings.enabled || !day) return null;
  const apps = Object.values(day.apps).filter((a) => a.seconds >= 60).sort((a, b) => b.seconds - a.seconds).slice(0, 6);
  if (apps.length === 0) return null;
  return (
    <section className="history-day" aria-label="Where the day went">
      <Text size="1" weight="medium" color="gray" className="section-label">Where the day went</Text>
      <ul className="rows">
        {apps.map((app) => (
          <li key={app.name} className="task-row history-row">
            <Text size="2" className="grow task-text clamp-1">{app.name}</Text>
            <Text size="1" color="gray">{hoursText(Math.round(app.seconds / 60))}</Text>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Props = { history: ReturnType<typeof useHistory>; documents: ReturnType<typeof useDocuments>; today: string };

/** Seven plain counts, oldest to newest. A count, not a streak: an empty day is just a dot. */
function WeekStrip({ week }: { week: HistoryDto["week"] }) {
  return (
    <ol className="week-strip" aria-label="Finished this week">
      {week.map((day) => (
        <li key={day.date} className="week-day" data-today={day === week[week.length - 1] || undefined} aria-label={`${dayLabel(day.date, week[week.length - 1]?.date ?? day.date)}: ${day.count} done`}>
          <Text size="1" color="gray" aria-hidden="true">{weekdayLetter(day.date)}</Text>
          <Text size="2" weight="medium" aria-hidden="true">{day.count === 0 ? "·" : day.count}</Text>
        </li>
      ))}
    </ol>
  );
}

/** What was finished, by day, newest first, each row with a way back to the list. */
export function HistoryLayer({ history, documents, today }: Props) {
  const { state, restore, load } = history;
  if (state.phase === "loading") return <Text size="2" color="gray" role="status" className="pulse">Looking back…</Text>;
  if (state.phase === "error") {
    return (
      <div className="history-empty">
        <Text size="2">{state.message}</Text>
        <Button size="1" variant="soft" radius="full" onClick={() => void load()}>Try again</Button>
      </div>
    );
  }
  const { days, week } = state.history;
  return (
    <div className="history">
      <WeekStrip week={week} />
      <DocumentsList documents={documents} />
      <DayWent />
      {days.length === 0 && <Text size="2" color="gray" className="history-empty">Nothing finished in the last month. The list is where it starts.</Text>}
      {days.map((day) => (
        <section key={day.date} className="history-day" aria-label={dayLabel(day.date, today)}>
          <Text size="1" weight="medium" color="gray" className="section-label">{dayLabel(day.date, today)} · {day.count}</Text>
          <ul className="rows">
            {day.tasks.map((task) => (
              <li key={task.id} className="task-row history-row">
                <Text size="2" className="grow task-text clamp-2">{task.title}</Text>
                <Button size="1" variant="ghost" color="gray" className="row-action" aria-label={`Restore: ${task.title}`} onClick={() => void restore(task.id, task.title)}>Restore</Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
