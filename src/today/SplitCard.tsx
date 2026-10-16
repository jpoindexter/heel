import { Cross2Icon } from "@radix-ui/react-icons";
import { Button, IconButton, Text } from "@radix-ui/themes";
import "./split.css";
import type { useSplit } from "./useSplit";

type Props = { split: ReturnType<typeof useSplit> };

/** Heel's proposed steps for one task, as a list the person trims; nothing is written until "Add these". */
export function SplitCard({ split }: Props) {
  const { state } = split;
  if (!state) return null;
  const { task, phase, steps, message } = state;
  return (
    <section className="split-card" aria-label={`Steps for ${task.title}`}>
      <Text size="1" weight="medium" color="gray" className="section-label">Steps for “{task.title}”</Text>
      {phase === "asking" && <Text size="2" color="gray" role="status" className="pulse split-note">Heel is thinking of steps…</Text>}
      {phase === "error" && <Text size="2" color="amber" role="alert" className="split-note">{message}</Text>}
      {phase === "ready" && (
        <ol className="rows split-steps">
          {steps.map((step, index) => (
            <li key={`${index}-${step}`} className="task-row">
              <Text size="2" as="span" className="grow task-text clamp-2">{step}</Text>
              <IconButton size="1" variant="ghost" color="gray" className="row-action" aria-label={`Leave out: ${step}`} onClick={() => split.remove(index)}>
                <Cross2Icon aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ol>
      )}
      <div className="split-actions">
        {phase === "ready" && steps.length > 0 && (
          <Button size="1" radius="full" onClick={() => void split.apply()}>Add these ({steps.length})</Button>
        )}
        {phase === "error" && <Button size="1" variant="soft" radius="full" onClick={() => void split.propose(task)}>Try again</Button>}
        <Button size="1" variant="ghost" color="gray" radius="full" onClick={split.cancel}>Not now</Button>
      </div>
    </section>
  );
}
