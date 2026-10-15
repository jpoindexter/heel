import { Button, Text } from "@radix-ui/themes";
import type { HistoryDto } from "../../shared/api";
import "./history.css";
import { dayLabel, weekdayLetter } from "./history-labels";
import type { useHistory } from "./useHistory";

type Props = { history: ReturnType<typeof useHistory>; today: string };

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
export function HistoryLayer({ history, today }: Props) {
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
      {days.length === 0 && <Text size="2" color="gray" className="history-empty">Nothing finished in the last month. The list is where it starts.</Text>}
      {days.map((day) => (
        <section key={day.date} className="history-day" aria-label={dayLabel(day.date, today)}>
          <Text size="1" weight="medium" color="gray" className="section-label">{dayLabel(day.date, today)} · {day.count}</Text>
          <ul className="rows">
            {day.tasks.map((task) => (
              <li key={task.id} className="task-row history-row">
                <Text size="2" className="grow task-text clamp-2">{task.title}</Text>
                <Button size="1" variant="ghost" color="gray" className="row-action" onClick={() => void restore(task.id, task.title)}>Restore</Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
