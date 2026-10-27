import { useEffect, useId, useState } from "react";
import { Switch, Text } from "@radix-ui/themes";
import { PomodoroViewSchema } from "../../shared/api";
import { PomodoroConfigSchema, type PomodoroConfig } from "../../shared/pomodoro";
import { client } from "../api/default-client";
import { useNotices } from "../ui/notices";
import { NumberField } from "./NumberField";

const FIELDS: { key: keyof Omit<PomodoroConfig, "autoStart">; label: string }[] = [
  { key: "workMin", label: "Work (min)" },
  { key: "shortMin", label: "Short break" },
  { key: "longMin", label: "Long break" },
  { key: "cycles", label: "Works before a long break" },
];

/** The Pomodoro's numbers. Each change is saved on blur and can be undone. */
export function PomodoroSettings() {
  const notices = useNotices();
  const id = useId();
  const [config, setConfig] = useState<PomodoroConfig | null>(null);

  useEffect(() => {
    void client.get("/pomodoro", PomodoroViewSchema).then((r) => r.ok && setConfig(r.data.config));
  }, []);

  const save = (next: PomodoroConfig, previous: PomodoroConfig): Promise<boolean> =>
    client.put("/pomodoro/config", PomodoroConfigSchema, next).then((r) => {
      if (!r.ok) return (notices.show({ message: r.error.message, tone: "error" }), false);
      setConfig(r.data);
      notices.show({ message: "Pomodoro lengths changed", tone: "info", undo: () => void save(previous, next) });
      return true;
    });

  if (!config) return null;
  return (
    <div className="pomodoro-settings">
      {FIELDS.map(({ key, label }) => (
        <NumberField key={key} id={`${id}-${key}`} label={label} value={config[key]} onCommit={(value) => save({ ...config, [key]: value }, config)} />
      ))}
      <Text as="label" size="2" className="pomodoro-switch">
        <Switch size="1" checked={config.autoStart} onCheckedChange={(autoStart) => void save({ ...config, autoStart }, config)} /> Start the next phase by itself
      </Text>
    </div>
  );
}
