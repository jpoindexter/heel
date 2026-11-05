import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Callout, Flex, Text, Theme } from "@radix-ui/themes";
import { client } from "../api/default-client";
import { CRASH_MESSAGE, crashLine } from "./crash-model";
import { logDebug } from "./debug-log";
import { copyText } from "./debug-log-report";
import { feedbackMail, openFeedbackMail, reportNow } from "./feedback-mail";
import "./crash.css";

type Props = { /** Which window, for the log line. */ name: string; children: ReactNode };
type State = { crashed: string | null; said: string | null };

const reload = () => window.location.reload();

/** The first frame of React's component stack: the component that threw, without the rest of the tree. */
const stackHead = (stack: string | null | undefined): string => stack?.trim().split("\n")[0]?.trim() ?? "";

/**
 * A thrown render error would otherwise unmount the whole window and leave it blank (React 19).
 * Instead: one calm line, what broke in small type, Reload, Email details (a draft to Jason) and Copy details (the debug report with the crash in it).
 * Draws its own Theme, since the crash may be inside the app's.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: null, said: null };

  static getDerivedStateFromError(error: unknown): Pick<State, "crashed"> {
    return { crashed: crashLine(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const line = crashLine(error);
    console.error(`[heel:${this.props.name}] render crashed: ${line}`, info.componentStack);
    logDebug("error", this.props.name, `render crashed: ${line} @ ${stackHead(info.componentStack)}`);
  }

  copyDetails = async (): Promise<void> => {
    const done = await copyText(await reportNow(client, this.state.crashed));
    this.setState({ said: done ? "Copied. Paste it to whoever is looking into it." : "Couldn't copy. Select the text above instead." });
  };

  emailDetails = async (): Promise<void> => {
    const crash = this.state.crashed ?? "unknown";
    const mail = feedbackMail({ kind: "bug", title: `Crash: ${crash}`, what: `The ${this.props.name} window showed the crash screen.`, more: "", report: await reportNow(client, crash) });
    const opened = await openFeedbackMail(client, mail);
    this.setState({ said: opened ? "An email to Jason is open in your mail app. Add what you were doing, then press Send." : "Couldn't open a mail app. Use Copy details and paste it into an email." });
  };

  render(): ReactNode {
    if (this.state.crashed === null) return this.props.children;
    return (
      <Theme accentColor="jade" grayColor="sand" radius="small" panelBackground="solid" hasBackground={false}>
        <main className="crash" role="alert">
          <Callout.Root color="amber" size="1" highContrast>
            <Callout.Text>{CRASH_MESSAGE}</Callout.Text>
          </Callout.Root>
          <Text size="1" color="gray" className="crash-detail">{this.state.crashed}</Text>
          <Flex gap="2" wrap="wrap">
            <Button size="2" radius="full" highContrast onClick={reload}>Reload</Button>
            <Button size="2" radius="full" variant="soft" onClick={() => void this.emailDetails()}>Email details</Button>
            <Button size="2" radius="full" variant="soft" onClick={() => void this.copyDetails()}>Copy details</Button>
          </Flex>
          {this.state.said && <Text size="1" color="gray" role="status">{this.state.said}</Text>}
        </main>
      </Theme>
    );
  }
}
