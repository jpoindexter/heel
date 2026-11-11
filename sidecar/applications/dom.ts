/// <reference lib="dom" />
import type { Frame, Page } from "playwright-core";
import type { ApplicationButton, ApplicationField } from "../../shared/applications";

/** Runs inside each frame, including accessible shadow DOM via Playwright's locators on write. */
const INSPECT_SOURCE = String.raw`(() => {
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const roots = [document];
  for (let index = 0; index < roots.length; index++) for (const el of roots[index].querySelectorAll("*")) if (el.shadowRoot) roots.push(el.shadowRoot);
  const query = selector => roots.flatMap(root => Array.from(root.querySelectorAll(selector)));
  const label = (el) => {
    const labelled = el.getAttribute("aria-labelledby")?.split(/\s+/).map(id => el.getRootNode().getElementById(id)?.textContent ?? "").join(" ");
    const control = el;
    return (el.getAttribute("aria-label") || labelled || Array.from(control.labels ?? []).map(l => { const copy = l.cloneNode(true); copy.querySelectorAll("input,select,textarea,button").forEach(c => c.remove()); return copy.textContent; }).join(" ") || el.getAttribute("placeholder") || el.textContent || control.name || control.id).trim().slice(0, 300);
  };
  const fields = query('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]),select,textarea,[role="combobox"],[role="textbox"],[role="checkbox"],[role="radio"]')
    .filter(el => !el.disabled && el.getAttribute("aria-disabled") !== "true" && (visible(el) || el.type === "file") && el.type !== "password");
  const result = fields.slice(0, 150).map((el) => {
    if (!el.dataset.heelField) el.dataset.heelField = crypto.randomUUID();
    const input = el;
    const role = el.getAttribute("role"), kind = ["combobox", "checkbox", "radio", "textbox"].includes(role) ? role : el.type;
    return { id: el.dataset.heelField, label: label(el), kind, required: !!el.required || el.getAttribute("aria-required") === "true",
      value: ["checkbox", "radio"].includes(kind) ? String(input.checked ?? (el.getAttribute("aria-checked") === "true")) : el.type === "file" ? Array.from(input.files ?? []).map(f => f.name).join(", ") : el.type === "select-multiple" ? JSON.stringify(Array.from(el.selectedOptions).map(o => o.value)) : (el.value ?? el.textContent ?? ""),
      options: el instanceof HTMLSelectElement ? Array.from(el.options).map(o => ({ label: o.label, value: o.value })) : [],
    };
  });
  const buttons = query('button,input[type="submit"],input[type="button"],a[href],[role="button"]').filter(visible).slice(0, 80).map(el => {
    if (!el.dataset.heelButton) el.dataset.heelButton = crypto.randomUUID();
    return { id: el.dataset.heelButton, label: label(el) || (el).value || "Continue" };
  });
  return { fields: result, buttons, text: (document.body?.innerText ?? "").slice(0, 20_000), invalid: fields.filter(el => el.required && typeof el.checkValidity === "function" && !el.checkValidity()).map(label), needsPerson: query('input[type="password"],input[autocomplete="one-time-code"],input[autocomplete="current-password"],input[autocomplete="new-password"]').some(visible) };
})()`;

export type Inspection = { url: string; title: string; fields: ApplicationField[]; buttons: ApplicationButton[]; text: string; invalid: string[]; needsPerson: boolean };

async function readPage(page: Page): Promise<Inspection> {
  const frames = await Promise.all(page.frames().map(async (frame, index) => {
    try {
      const data = await frame.evaluate(INSPECT_SOURCE) as { fields: ApplicationField[]; buttons: ApplicationButton[]; text: string; invalid: string[]; needsPerson: boolean };
      return { ...data, fields: data.fields.map(f => ({ ...f, id: `${index}:${f.id}` })), buttons: data.buttons.map(b => ({ ...b, id: `${index}:${b.id}` })) };
    } catch (error) { if (index === 0) throw error; return { fields: [], buttons: [], text: "", invalid: [], needsPerson: false }; }
  }));
  return { url: page.url(), title: await page.title(), fields: frames.flatMap(f => f.fields), buttons: frames.flatMap(f => f.buttons), text: frames.map(f => f.text).join("\n").slice(0, 30_000), invalid: frames.flatMap(f => f.invalid), needsPerson: frames.some(f => f.needsPerson) };
}

export async function inspect(page: Page): Promise<Inspection> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("The page is changing. Review any waiting request, then refresh the form.")), 2500); });
  try { return await Promise.race([readPage(page), limit]); }
  finally { clearTimeout(timer); }
}

function target(page: Page, id: string, kind: "field" | "button") {
  const [index, key] = id.split(":");
  if (!/^\d+$/.test(index ?? "") || !/^[\da-f-]{36}$/.test(key ?? "")) throw new Error("That form control is no longer available. Refresh the form.");
  const frame: Frame | undefined = page.frames()[Number(index)];
  if (!frame) throw new Error("That form frame closed. Refresh the form.");
  return frame.locator(`[data-heel-${kind}="${key}"]`);
}

export async function fillField(page: Page, field: ApplicationField, value: string) {
  const el = target(page, field.id, "field");
  if (["checkbox", "radio"].includes(field.kind)) {
    if (!["true", "false"].includes(value)) throw new Error(`Choose checked or unchecked for ${field.label}.`);
    await el.setChecked(value === "true");
  } else if (field.kind === "select-multiple") {
    const values = JSON.parse(value) as unknown;
    if (!Array.isArray(values) || values.some(v => typeof v !== "string")) throw new Error("Choose valid options for this field.");
    await el.selectOption(values);
  } else if (field.kind.startsWith("select")) await el.selectOption(value);
  else if (field.kind === "combobox") {
    // shortcut: custom comboboxes need accessible option names; use the visible browser for canvas-only widgets.
    await el.click();
    if (await el.evaluate(node => node.tagName === "INPUT")) await el.fill(value);
    const frame = page.frames()[Number(field.id.split(":")[0])]!;
    await frame.getByRole("option", { name: value, exact: true }).click();
  }
  else if (field.kind === "file") throw new Error("Choose the attachment with the CV picker.");
  else await el.fill(value);
}

export const clickButton = (page: Page, id: string) => target(page, id, "button").click({ timeout: 5000, noWaitAfter: true });
export const attachFile = (page: Page, id: string, payload: { name: string; mimeType: string; buffer: Buffer }) => target(page, id, "field").setInputFiles(payload, { timeout: 5000 });
