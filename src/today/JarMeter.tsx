import { Button, Text } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";
import type { Method, MethodNumbers } from "../../shared/method";
import { JAR_FULL_PROMPT, jarFor } from "./jar-model";
import { dayTotal } from "./size-model";

type Props = { tasks: readonly TaskDto[]; method: Method; numbers: MethodNumbers; onAsk: (prompt: string, label: string) => void };

/** One quiet line over the list: the jar's state (Pickle jar), or the day's minutes (sizes alone). Full is a calm sentence with one way out. */
export function JarMeter({ tasks, method, numbers, onAsk }: Props) {
  if (method.structure === "pickle-jar") {
    const jar = jarFor(tasks, numbers, method.sizing);
    if (jar.rocks + jar.pebbles + jar.sand === 0) return null;
    return (
      <div className="jar-meter" role="status">
        <Text size="1" color="gray">{jar.line}</Text>
        {jar.full && (
          <span className="jar-full">
            <Text size="1">That's a full day.</Text>
            <Button size="1" variant="soft" radius="full" onClick={() => onAsk(JAR_FULL_PROMPT, "Park something")}>Park something?</Button>
          </span>
        )}
      </div>
    );
  }
  if (method.sizing === "tshirt") {
    const total = dayTotal(tasks, numbers);
    if (!total.line) return null;
    return (
      <div className="jar-meter" role="status">
        <Text size="1" color="gray">{total.line}</Text>
      </div>
    );
  }
  return null;
}
