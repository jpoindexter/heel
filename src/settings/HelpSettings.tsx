import { Heading, Text } from "@radix-ui/themes";
import { HELP_TOPICS } from "./help-topics";

/** Settings › Help: task-shaped topics, each folded to its title so the list stays scannable. */
export function HelpSettings() {
  return (
    <section aria-labelledby="help-heading" className="settings-section">
      <Heading as="h3" id="help-heading" size="2">How Heel works</Heading>
      {HELP_TOPICS.map((topic) => (
        <details key={topic.id} className="debug-fold">
          <summary><Text size="2" weight="medium">{topic.title}</Text></summary>
          <Text as="div" size="2">
            <ol className="help-steps">
              {topic.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </Text>
        </details>
      ))}
    </section>
  );
}
