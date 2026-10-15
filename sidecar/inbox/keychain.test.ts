import { describe, expect, it } from "vitest";
import type { RunCommand, RunOptions } from "../agent/providers/process";
import { macKeychain, memorySecrets } from "./keychain";

function recorder(stdout = "") {
  const calls: { args: readonly string[]; options: RunOptions }[] = [];
  const run: RunCommand = async (_tool, args, options) => {
    calls.push({ args, options });
    return { ok: true, stdout, stderr: "" };
  };
  return { run, calls };
}

describe("macKeychain", () => {
  it("sends a secret on stdin, never on the command line", async () => {
    const { run, calls } = recorder();
    await macKeychain(run).set("gmail-tokens", '{"refresh":"s3cr3t \\"quoted\\""}');
    const call = calls[0]!;
    expect(call.args).toEqual(["-i"]);
    expect(call.args.join(" ")).not.toContain("s3cr3t");
    expect(call.options.input).toContain("add-generic-password -U -a gmail-tokens");
    expect(call.options.input).not.toContain("s3cr3t"); // stored as base64, so quotes and backslashes cannot break the command
  });

  it("reads a secret back, decoding what it stored", async () => {
    const value = '{"a":"b \\"c\\""}';
    const { run } = recorder(Buffer.from(value).toString("base64"));
    expect(await macKeychain(run).get("gmail-tokens")).toBe(value);
  });

  it("says null when nothing is stored", async () => {
    const run: RunCommand = async () => ({ ok: false, kind: "exit", message: "not found", stdout: "", stderr: "" });
    expect(await macKeychain(run).get("nope")).toBeNull();
  });

  it("fails loudly when it cannot save, so nobody believes a token was kept", async () => {
    const run: RunCommand = async () => ({ ok: false, kind: "exit", message: "denied", stdout: "", stderr: "" });
    await expect(macKeychain(run).set("x", "y")).rejects.toThrow("Couldn't save to the Keychain: denied");
  });
});

describe("memorySecrets", () => {
  it("stores, reads and removes", async () => {
    const secrets = memorySecrets();
    await secrets.set("a", "1");
    expect(await secrets.get("a")).toBe("1");
    await secrets.remove("a");
    expect(await secrets.get("a")).toBeNull();
  });
});
