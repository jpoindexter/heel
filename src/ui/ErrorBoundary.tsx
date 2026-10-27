import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Callout, Text, Theme } from "@radix-ui/themes";
import { CRASH_MESSAGE, crashLine } from "./crash-model";
import "./crash.css";

type Props = { /** Which window, for the log line. */ name: string; children: ReactNode };
type State = { crashed: string | null };

const reload = () => window.location.reload();

/**
 * A thrown render error would otherwise unmount the whole window and leave it blank (React 19).
 * Instead: one calm line, what broke in small type, and Reload. Draws its own Theme, since the crash may be inside the app's.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: null };

  static getDerivedStateFromError(error: unknown): State {
    return { crashed: crashLine(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(`[heel:${this.props.name}] render crashed: ${crashLine(error)}`, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.crashed === null) return this.props.children;
    return (
      <Theme accentColor="jade" grayColor="sand" radius="small" panelBackground="solid" hasBackground={false}>
        <main className="crash" role="alert">
          <Callout.Root color="amber" size="1" highContrast>
            <Callout.Text>{CRASH_MESSAGE}</Callout.Text>
          </Callout.Root>
          <Text size="1" color="gray" className="crash-detail">{this.state.crashed}</Text>
          <Button size="2" radius="full" highContrast onClick={reload}>Reload</Button>
        </main>
      </Theme>
    );
  }
}
