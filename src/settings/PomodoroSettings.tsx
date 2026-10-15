import { useEffect, useId, useState } from "react";
import { Switch, Text, TextField } from "@radix-ui/themes";
import { PomodoroViewSchema } from "../../shared/api";
import { PomodoroConfigSchema, type PomodoroConfig } from "../../shared/pomodoro";
import { client } from "../api/default-client";
import { useNotices } from "../ui/notices";

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

  const save = (next: PomodoroConfig, previous: PomodoroConfig) => {
    void client.put("/pomodoro/config", PomodoroConfigSchema, next).then((r) => {
      if (!r.ok) return notices.show({ message: r.error.message, tone: "error" });
      setConfig(r.data);
      notices.show({ message: "Pomodoro lengths changed", tone: "info", undo: () => save(previous, next) });
    });
  };

  if (!config) return null;
  return (
    <div className="pomodoro-settings">
      {FIELDS.map(({ key, label }) => (
        <div key={key} className="field">
          <Text as="label" size="1" color="gray" htmlFor={`${id}-${key}`}>{label}</Text>
          <TextField.Root
            id={`${id}-${key}`}
            size="1"
            type="number"
            inputMode="numeric"
            defaultValue={config[key]}
            onBlur={(event) => {
              const value = Number(event.target.value);
              if (value !== config[key]) save({ ...config, [key]: value }, config);
            }}
          />
        </div>
      ))}
      <Text as="label" size="2" className="pomodoro-switch">
        <Switch size="1" checked={config.autoStart} onCheckedChange={(autoStart) => save({ ...config, autoStart }, config)} /> Start the next phase by itself
      </Text>
    </div>
  );
}
