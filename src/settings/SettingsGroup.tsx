import { ChevronRightIcon } from "@radix-ui/react-icons";
import { Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

type Props = {
  title: string;
  /** The current values, read at rest; nobody opens a group just to check. */
  summary: string;
  children: ReactNode;
};

/**
 * Level one of the two-level Settings (N4): a native disclosure row with the group's name and its values at rest.
 * All groups share one `name`, so opening one folds the others and the panel stays one short list.
 */
export function SettingsGroup({ title, summary, children }: Props) {
  return (
    <details className="settings-group" name="settings-group">
      <summary className="settings-group-summary">
        <ChevronRightIcon aria-hidden="true" className="settings-group-chevron" />
        <Heading as="h2" size="2" className="grow">{title}</Heading>
        <Text size="1" color="gray" className="settings-group-value">{summary}</Text>
      </summary>
      <div className="settings-group-body">{children}</div>
    </details>
  );
}
