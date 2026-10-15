import { Heading, SegmentedControl, Text } from "@radix-ui/themes";
import { BUILT, SIZINGS, STRUCTURES, TIMERS, type Method, type Sizing, type Structure, type Timer } from "../../shared/method";
import { useMethod, whatChanges } from "../ui/method";
import { useNotices } from "../ui/notices";
import { PomodoroSettings } from "./PomodoroSettings";

const TIMER_LABELS: Record<Timer, string> = { timebox: "Time-box", pomodoro: "Pomodoro" };
const STRUCTURE_LABELS: Record<Structure, string> = { none: "None", "pickle-jar": "Pickle jar", "one-three-five": "1-3-5", eisenhower: "Eisenhower", frog: "Frog" };
const SIZING_LABELS: Record<Sizing, string> = { none: "None", tshirt: "T-shirt" };

type PickerProps<T extends string> = { label: string; value: T; options: readonly T[]; built: readonly T[]; labels: Record<T, string>; onChange: (next: T) => void };

/** One row of choices: only what is built can be picked; the rest is named below so nobody looks for it. */
function Picker<T extends string>({ label, value, options, built, labels, onChange }: PickerProps<T>) {
  const later = options.filter((option) => !built.includes(option)).map((option) => labels[option]);
  return (
    <div className="field">
      <Text as="p" size="1" weight="medium" color="gray">{label}</Text>
      <SegmentedControl.Root value={value} onValueChange={(next) => onChange(next as T)} aria-label={label}>
        {built.map((option) => (
          <SegmentedControl.Item key={option} value={option}>{labels[option]}</SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
      {later.length > 0 && <Text as="p" size="1" color="gray">Later: {later.join(", ")}.</Text>}
    </div>
  );
}

/** Ways of working: a timer, a structure and a sizing that combine. Changes apply at once, with Undo. */
export function MethodSettings() {
  const { method, change } = useMethod();
  const notices = useNotices();
  const apply = (next: Method) => {
    const previous = method;
    void change(next).then((refused) => {
      if (refused) return notices.show({ message: refused, tone: "error" });
      notices.show({ message: "Ways of working changed", tone: "info", undo: () => void change(previous) });
    });
  };
  return (
    <section aria-labelledby="method-heading" className="settings-section">
      <Heading as="h2" id="method-heading" size="2">Ways of working</Heading>
      <Text as="p" size="1" color="gray">Pick how the day is shaped. They combine.</Text>
      <Picker label="Timer" value={method.timer} options={TIMERS} built={BUILT.timer} labels={TIMER_LABELS} onChange={(timer) => apply({ ...method, timer })} />
      {method.timer === "pomodoro" && <PomodoroSettings />}
      <Picker label="Structure" value={method.structure} options={STRUCTURES} built={BUILT.structure} labels={STRUCTURE_LABELS} onChange={(structure) => apply({ ...method, structure })} />
      <Picker label="Sizing" value={method.sizing} options={SIZINGS} built={BUILT.sizing} labels={SIZING_LABELS} onChange={(sizing) => apply({ ...method, sizing })} />
      <Text as="p" size="1" color="gray" role="status">{whatChanges(method)}</Text>
    </section>
  );
}
