import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function publicAddress(address: string): boolean {
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address);
  if (isIP(address) !== 4) return false;
  const [a = 0, b = 0] = address.split(".").map(Number);
  return a > 0 && a < 224 && ![10, 127].includes(a) && !(a === 169 && b === 254)
    && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && [0, 168].includes(b))
    && !(a === 100 && b >= 64 && b <= 127) && !(a === 198 && [18, 19].includes(b));
}

/** Test origins are supplied only by the controlled fixture, never by a request or an environment flag. */
export function urlPolicy(testOrigins: readonly string[] = []) {
  return async (value: string): Promise<void> => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Use an HTTPS job page without a password in its address.");
    if (testOrigins.includes(url.origin)) return;
    if (url.protocol !== "https:") throw new Error("Job websites must use HTTPS.");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) throw new Error("Heel cannot open local or private network addresses as job websites.");
  };
}
