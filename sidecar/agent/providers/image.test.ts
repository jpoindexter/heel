import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { codexProvider } from "./codex";
import { claudeProvider } from "./claude";
import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { mistralProvider } from "./mistral";
import { ollamaProvider } from "./ollama";
import { fakeDeps, jsonResponse, OK } from "./test-deps";

const request = { system: "SYSTEM", prompt: "Look at this page", model: "vision-model", image: { data: Buffer.from("synthetic png transport").toString("base64"), mimeType: "image/png" as const } };

describe("browser screenshot transports", () => {
  it("passes a private screenshot file to Codex and removes it after completion", async () => {
    const deps = fakeDeps(); let imagePath = "";
    deps.run = async (_executable, args) => {
      imagePath = args[args.indexOf("--image") + 1]!;
      expect(readFileSync(imagePath, "utf8")).toBe("synthetic png transport");
      expect(args).toContain("read-only");
      return OK("answer");
    };
    expect(await codexProvider(deps).complete(request)).toEqual({ ok: true, value: "answer" });
    expect(existsSync(imagePath)).toBe(false);
  });
  it("keeps Claude tools disabled while sending an image input block", async () => {
    const deps = fakeDeps({ answers: { "-p": OK("answer") } });
    expect((await claudeProvider(deps).complete(request)).ok).toBe(true);
    expect(deps.calls[0]!.args).toEqual(expect.arrayContaining(["--input-format", "stream-json", "--tools", ""]));
    const message = JSON.parse(deps.calls[0]!.options.input!);
    expect(message.message.content[0]).toMatchObject({ type: "image", source: { type: "base64", data: request.image.data } });
  });
  it("encodes screenshots in each HTTP provider's image format", async () => {
    const seen: Record<string, unknown>[] = [];
    const deps = fakeDeps({ secrets: { "provider-key:openai": "test", "provider-key:anthropic": "test", "provider-key:mistral": "test" }, fetch: async (_url, init) => { seen.push(JSON.parse(String(init?.body))); return jsonResponse({ choices: [{ message: { content: "answer" } }], content: [{ type: "text", text: "answer" }], stop_reason: "end_turn", message: { content: "answer" } }); } });
    for (const provider of [openaiProvider(deps), anthropicProvider(deps), mistralProvider(deps), ollamaProvider(deps)]) expect((await provider.complete(request)).ok).toBe(true);
    const json = JSON.stringify(seen);
    expect(json).toContain(`data:image/png;base64,${request.image.data}`);
    expect(json).toContain('"media_type":"image/png"');
    expect(json).toContain(`"images":["${request.image.data}"]`);
    expect(seen).toHaveLength(4);
  });
});
