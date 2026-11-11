const SECRET = /pass(?:word|code)?|token|secret|authorization|credential|api.?key|signature|session|^code$|csrf|xsrf/i;

export function safeUrl(value: string): string {
  const url = new URL(value);
  for (const key of url.searchParams.keys()) if (SECRET.test(key)) url.searchParams.set(key, "[redacted]");
  url.hash = "";
  return url.href;
}

export const safeValue = (key: string, value: string) => SECRET.test(key) ? "[redacted]" : value;

export function redactJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET.test(key) ? "[redacted]" : redactJson(item)]));
}
