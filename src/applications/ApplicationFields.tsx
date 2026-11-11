import type { ApplicationField } from "../../shared/applications";

type Props = { fields: ApplicationField[]; values: Record<string, string>; disabled: boolean; onChange: (id: string, value: string) => void; onFile: (id: string, file: File) => void };

export function ApplicationFields({ fields, values, disabled, onChange, onFile }: Props) {
  return <div className="application-fields">{fields.map(field => {
    const id = `application-${field.id}`;
    return <div key={field.id}>
      <label htmlFor={id}>{field.label || "Unnamed field"}{field.required ? " (required)" : ""}</label>
      {field.kind === "file" ? <><input id={id} type="file" disabled={disabled} accept=".pdf,.doc,.docx,.txt" onChange={e => { const file = e.target.files?.[0]; if (file) onFile(field.id, file); }} /><span>{field.value || "No file attached"}</span></>
        : ["checkbox", "radio"].includes(field.kind) ? <select id={id} disabled={disabled} value={values[field.id] ?? field.value} onChange={e => onChange(field.id, e.target.value)}><option value="false">Not checked</option><option value="true">Checked</option></select>
        : field.options.length ? <select id={id} multiple={field.kind === "select-multiple"} disabled={disabled} value={field.kind === "select-multiple" ? JSON.parse(values[field.id] ?? field.value) as string[] : values[field.id] ?? field.value} onChange={e => onChange(field.id, field.kind === "select-multiple" ? JSON.stringify(Array.from(e.target.selectedOptions).map(o => o.value)) : e.target.value)}>{field.options.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}</select>
        : <textarea id={id} rows={field.kind === "textarea" ? 4 : 1} disabled={disabled} value={values[field.id] ?? field.value} onChange={e => onChange(field.id, e.target.value)} />}
    </div>;
  })}</div>;
}
