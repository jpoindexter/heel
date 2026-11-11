import { describe, expect, it } from "vitest";
import { publicAddress, urlPolicy } from "./url";
import { resolveChromiumExecutable } from "./launch";
import { suggestAnswers } from "./fill";
import { fakeProvider } from "../server/test-app";
import { redactJson, safeUrl, safeValue } from "./privacy";

describe("application trust boundaries", () => {
  it("blocks local/private IPv4, IPv6, file URLs and credentials", async () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "::1", "::ffff:127.0.0.1", "fc00::1", "100.64.0.1"]) expect(publicAddress(ip)).toBe(false);
    expect(publicAddress("8.8.8.8")).toBe(true);
    expect(publicAddress("2606:4700::1111")).toBe(true);
    for (const url of ["file:///etc/passwd", "https://127.0.0.1/job", "http://example.com", "https://user:pass@example.com"]) await expect(urlPolicy()(url)).rejects.toThrow();
  });
  it("uses Vanta's installed-browser fallback without importing Vanta profiles", () => {
    const browser = { executablePath: () => "/missing" };
    expect(resolveChromiumExecutable(browser, { env: {}, exists: p => p.includes("Brave Browser"), platform: "darwin" })).toContain("Brave Browser");
    expect(resolveChromiumExecutable(browser, { env: {}, exists: p => p === "/missing" })).toBeUndefined();
  });
  it("does not retain credentials in site request previews", () => {
    expect(redactJson({ password: "private", data: { access_token: "private", name: "Iris" } })).toEqual({ password: "[redacted]", data: { access_token: "[redacted]", name: "Iris" } });
    expect(safeValue("csrf_token", "private")).toBe("[redacted]");
    expect(safeUrl("https://example.test/apply?token=private&job=123#private")).not.toContain("private");
    expect(safeUrl("https://example.test/apply?token=private&job=123")).toContain("job=123");
  });
  it("rejects invented sources and unknown field IDs from the model", async () => {
    const field = { id: "name", label: "Name", kind: "text", required: true, value: "", options: [] };
    for (const answer of [{ id: "name", value: "Made up", source: "Not supplied" }, { id: "not-a-field", value: "Iris", source: "Iris" }]) {
      const provider = fakeProvider("codex", {}, { ok: true, value: [] }, { ok: true, value: JSON.stringify({ answers: [answer] }) });
      await expect(suggestAnswers({ provider, model: null, facts: "Iris", fields: [field] })).rejects.toThrow("unsupported answer");
    }
  });
});
