import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Text } from "@radix-ui/themes";
import { APP_VERSION } from "../../shared/version";
import { client } from "../api/default-client";
import { formatLog } from "../ui/debug-log";
import { useDebugReport } from "./useDebugReport";

/** The shell restarts the helper; outside Tauri (a browser preview) there is nobody to ask. */
const restartHelper = () => void invoke("restart_helper").catch(() => undefined);

/** About: the facts at a glance. Debug, folded under it: both logs, and the report copied, saved, or cleared. */
export function DebugSettings({ active }: { active: boolean }) {
  const { helper, log, said, copy, exportFile, clear } = useDebugReport(client, active);
  const panelLog = useRef<HTMLPreElement>(null);
  // The newest line is the one worth reading first: after a crash and Reload it is the crash.
  useEffect(() => void panelLog.current?.scrollTo({ top: panelLog.current.scrollHeight }), [log]);
  const facts: [string, string][] = [
    ["Heel", APP_VERSION],
    ["Mac", helper?.os ?? "—"],
    ["Data folder", helper?.dataDir ?? "—"],
    ["Helper", helper ? `port ${helper.port ?? "?"} · Node ${helper.node} · database v${helper.migration}` : "not reached"],
    ["Brain", helper ? (helper.provider ?? "none chosen") : "—"],
    ["Attention sense", helper ? (helper.attention ? "on" : "off") : "—"],
    ["Kept", helper ? `${helper.counts.tasks} tasks · ${helper.counts.parked} parked · ${helper.counts.documents} documents` : "—"],
  ];
  return (
    <section aria-label="About" className="settings-section">
      <Text as="div" size="1">
        <dl className="about-facts">
          {facts.map(([name, value]) => (
            <div key={name} className="about-fact">
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Text>
      <div className="skill-actions">
        <Button size="1" variant="ghost" color="gray" radius="full" onClick={restartHelper}>Restart helper</Button>
      </div>
      <details className="debug-fold">
        <summary><Text size="2" weight="medium">Debug</Text></summary>
        <div className="settings-section">
          <Text as="p" size="1" color="gray">What Heel noted about itself: where and when, never what you wrote. Hand it over when something breaks.</Text>
          <Text as="p" size="1" weight="medium" id="panel-log-label">Panel log</Text>
          <pre ref={panelLog} className="debug-log" tabIndex={0} aria-labelledby="panel-log-label">{log.length ? formatLog(log) : "Nothing noted yet."}</pre>
          <Text as="p" size="1" weight="medium" id="helper-log-label">Helper log</Text>
          <pre className="debug-log" tabIndex={0} aria-labelledby="helper-log-label">{helper ? helper.sidecarLog.join("\n") || "Empty." : "Helper not reached."}</pre>
          <div className="skill-actions">
            <Button size="1" variant="soft" radius="full" onClick={() => void copy()}>Copy report</Button>
            <Button size="1" variant="soft" radius="full" onClick={() => void exportFile()}>Export report…</Button>
            <Button size="1" variant="ghost" color="gray" radius="full" onClick={clear}>Clear log</Button>
          </div>
          {said && <Text as="p" size="1" color="gray" role="status">{said}</Text>}
        </div>
      </details>
    </section>
  );
}
