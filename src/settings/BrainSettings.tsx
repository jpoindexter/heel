import { useState } from "react";
import { client } from "../api/default-client";
import { modelControl, providerRows, type ModelControl, type ProviderRow } from "./brain-model";
import { useBrain } from "./useBrain";

function ProviderChoice({ row, onChoose }: { row: ProviderRow; onChoose: () => void }) {
  const nameId = `provider-${row.id}-name`;
  const detailId = `provider-${row.id}-detail`;
  return (
    <label className="choice" data-disabled={!row.ready || undefined}>
      <input
        type="radio"
        name="provider"
        value={row.id}
        checked={row.selected}
        disabled={!row.ready}
        aria-labelledby={nameId}
        aria-describedby={detailId}
        onChange={onChoose}
      />
      <span className="choice-main">
        <span id={nameId} className="choice-name">{row.label}</span>
        <span id={detailId} className="choice-detail">
          <span className="mark" data-ready={row.ready} aria-hidden="true">
            {row.ready ? "✓" : "!"}
          </span>
          {row.statusText}. {row.detail}
        </span>
      </span>
    </label>
  );
}

function ModelField({ control, onCommit }: { control: Exclude<ModelControl, { kind: "none" }>; onCommit: (model: string | null) => void }) {
  const [draft, setDraft] = useState(control.kind === "text" ? control.value : "");
  const helperId = "model-helper";

  if (control.kind === "select") {
    return (
      <div className="field">
        <label htmlFor="model">Model</label>
        <select id="model" value={control.value ?? ""} aria-describedby={helperId} onChange={(event) => onCommit(event.target.value || null)}>
          {control.required ? <option value="" disabled>Choose a model</option> : <option value="">Provider default</option>}
          {control.options.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <p id={helperId} className="helper">{control.required ? "Local models only appear here once Ollama reports them." : "Optional. Leave on the default if unsure."}</p>
      </div>
    );
  }

  const commit = () => onCommit(draft.trim() || null);
  return (
    <div className="field">
      <label htmlFor="model">Model (optional)</label>
      <input
        id="model"
        type="text"
        value={draft}
        aria-describedby={helperId}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
      <p id={helperId} className="helper">Leave empty to use the provider's default.</p>
    </div>
  );
}

export function BrainSettings({ active }: { active: boolean }) {
  const brain = useBrain(client, active);
  const { view, notice, test } = brain;

  return (
    <section aria-labelledby="brain-heading" className="section" data-notice={notice ? "" : undefined}>
      <h2 id="brain-heading">Brain</h2>
      <p className="helper">Pick the AI Heel uses. What you type goes to that provider. Local keeps it on this Mac.</p>

      {view.phase === "loading" && <p role="status">Checking your providers…</p>}

      {view.phase === "error" && (
        <div role="alert" className="callout">
          <p>{view.message}</p>
          <button type="button" className="button" onClick={() => void brain.refresh()}>Try again</button>
        </div>
      )}

      {view.phase === "ready" && (
        <>
          <fieldset className="choices">
            <legend>AI provider</legend>
            {providerRows(view.state).map((row) => (
              <ProviderChoice key={row.id} row={row} onChoose={() => void brain.choose(row.id)} />
            ))}
          </fieldset>

          {(() => {
            const control = modelControl(view.state.settings.provider, view.models, view.state.settings.model);
            const key = `${view.state.settings.provider}-${view.state.settings.model}`;
            return control.kind === "none" ? null : <ModelField key={key} control={control} onCommit={(model) => void brain.setModel(model)} />;
          })()}

          <div className="actions">
            <button type="button" className="button" aria-busy={test.phase === "running"} disabled={test.phase === "running"} onClick={() => void brain.runTest()}>
              {test.phase === "running" ? "Testing…" : "Test connection"}
            </button>
            <button type="button" className="button button-quiet" onClick={() => void brain.refresh()}>Check again</button>
          </div>
          <p role="status" className="test-result" data-ok={test.phase === "done" ? test.ok : undefined}>
            {test.phase === "done" ? `${test.ok ? "✓" : "!"} ${test.message}` : ""}
          </p>
        </>
      )}

      {notice && (
        <div role="status" className="toast" data-tone={notice.tone}>
          <span>{notice.message}</span>
          {notice.undo && (
            <button type="button" className="button button-quiet" onClick={() => { notice.undo?.(); brain.dismissNotice(); }}>Undo</button>
          )}
        </div>
      )}
    </section>
  );
}
