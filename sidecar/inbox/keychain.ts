import type { RunCommand } from "../agent/providers/process";

/** Where secrets live. The real one is the macOS Keychain; tests use a Map. */
export type SecretStore = {
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  remove(name: string): Promise<void>;
};

const SERVICE = "studio.theft.heel";
const SECURITY_TIMEOUT_MS = 10_000;

const encode = (value: string): string => Buffer.from(value, "utf8").toString("base64");
const decode = (value: string): string => Buffer.from(value, "base64").toString("utf8");

/**
 * The macOS Keychain through the `security` tool. A secret is sent on stdin (never on the command line, where `ps` could
 * show it) and stored as base64 so quotes and backslashes can't break the command.
 */
export function macKeychain(run: RunCommand, tool = "/usr/bin/security"): SecretStore {
  return {
    async get(name) {
      const result = await run(tool, ["find-generic-password", "-a", name, "-s", SERVICE, "-w"], { timeoutMs: SECURITY_TIMEOUT_MS });
      return result.ok && result.stdout ? decode(result.stdout) : null;
    },
    async set(name, value) {
      const command = `add-generic-password -U -a ${name} -s ${SERVICE} -w ${encode(value)}\n`;
      const result = await run(tool, ["-i"], { input: command, timeoutMs: SECURITY_TIMEOUT_MS });
      if (!result.ok) throw new Error(`Couldn't save to the Keychain: ${result.message}`);
    },
    async remove(name) {
      await run(tool, ["delete-generic-password", "-a", name, "-s", SERVICE], { timeoutMs: SECURITY_TIMEOUT_MS });
    },
  };
}

export function memorySecrets(initial: Record<string, string> = {}): SecretStore {
  const map = new Map(Object.entries(initial));
  return {
    get: async (name) => map.get(name) ?? null,
    set: async (name, value) => void map.set(name, value),
    remove: async (name) => void map.delete(name),
  };
}
