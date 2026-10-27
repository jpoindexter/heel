import { Heading, SegmentedControl, Select, Text } from "@radix-ui/themes";
import { BUILT, SIZINGS, STRUCTURES, TIMERS, type Method } from "../../shared/method";
import { undoSaid } from "../ui/undo-said";
import { useMethod, whatChanges } from "../ui/method";
import { useNotices } from "../ui/notices";
import { MethodNumbersSettings } from "./MethodNumbersSettings";
import { PomodoroSettings } from "./PomodoroSettings";
import { SIZING_LABELS, STRUCTURE_LABELS, TIMER_LABELS } from "./settings-model";

type PickerProps<T extends string> = { label: string; value: T; options: readonly T[]; built: readonly T[]; labels: Record<T, string>; onChange: (next: T) => void };

/** Up to this many choices read at a glance side by side in a 300 pt panel; more become a select. */
const MAX_SEGMENTS = 3;

/** One row of choices: only what is built can be picked; the rest is named below so nobody looks for it. */
function Picker<T extends string>({ label, value, options, built, labels, onChange }: PickerProps<T>) {
  const later = options.filter((option) => !built.includes(option)).map((option) => labels[option]);
  return (
    <div className="field">
      <Text as="p" size="1" weight="medium" color="gray">{label}</Text>
      {built.length > MAX_SEGMENTS ? (
        <Select.Root value={value} onValueChange={(next) => onChange(next as T)}>
          <Select.Trigger aria-label={label} />
          <Select.Content>
            {built.map((option) => (
              <Select.Item key={option} value={option}>{labels[option]}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      ) : (
        <SegmentedControl.Root value={value} onValueChange={(next) => onChange(next as T)} aria-label={label}>
          {built.map((option) => (
            <SegmentedControl.Item key={option} value={option}>{labels[option]}</SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      )}
      {later.length > 0 && <Text as="p" size="1" color="gray">Later: {later.join(", ")}.</Text>}
    </div>
  );
}

/** Ways of working: a timer, a structure and a sizing that combine. Changes apply at once, with Undo. */
export function MethodSettings() {
  const { method, change } = useMethod();
  const notices = useNotices();
  const fail = (message: string) => notices.show({ message, tone: "error" });
  const apply = (next: Method) => {
    const previous = method;
    void change(next).then((refused) => {
      if (refused) return fail(refused);
      notices.show({ message: "Ways of working changed", tone: "info", undo: undoSaid(() => change(previous), fail) });
    });
  };
  return (
    <section aria-labelledby="method-heading" className="settings-section">
      <Heading as="h3" id="method-heading" size="2">Ways of working</Heading>
      <Text as="p" size="1" color="gray">Pick how the day is shaped. They combine.</Text>
      <Picker label="Timer" value={method.timer} options={TIMERS} built={BUILT.timer} labels={TIMER_LABELS} onChange={(timer) => apply({ ...method, timer })} />
      {method.timer === "pomodoro" && <PomodoroSettings />}
      <Picker label="Structure" value={method.structure} options={STRUCTURES} built={BUILT.structure} labels={STRUCTURE_LABELS} onChange={(structure) => apply({ ...method, structure })} />
      <Picker label="Sizing" value={method.sizing} options={SIZINGS} built={BUILT.sizing} labels={SIZING_LABELS} onChange={(sizing) => apply({ ...method, sizing })} />
      <MethodNumbersSettings method={method} />
      <Text as="p" size="1" color="gray" role="status">{whatChanges(method)}</Text>
    </section>
  );
}
