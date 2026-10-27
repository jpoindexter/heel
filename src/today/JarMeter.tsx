import { Button, Text } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";
import type { Method, MethodNumbers } from "../../shared/method";
import { meterFor } from "./meter-model";

type Props = { tasks: readonly TaskDto[]; method: Method; numbers: MethodNumbers; onAsk: (prompt: string, label: string) => void };

/** One quiet line over the list: the structure's state (the jar, the frog…), or the day's minutes (sizes alone). Over the rule = a calm sentence with one way out. */
export function JarMeter({ tasks, method, numbers, onAsk }: Props) {
  const meter = meterFor(tasks, method, numbers);
  if (!meter) return null;
  const { ask } = meter;
  return (
    <div className="jar-meter" role="status">
      <Text size="1" color="gray">{meter.line}</Text>
      {ask && (
        <span className="jar-full">
          {meter.note && <Text size="1">{meter.note}</Text>}
          <Button size="1" variant="soft" radius="full" onClick={() => onAsk(ask.prompt, ask.label)}>{`${ask.label}?`}</Button>
        </span>
      )}
    </div>
  );
}
