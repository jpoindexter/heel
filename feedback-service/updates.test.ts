import { it, expect } from "vitest";
import { receiverFixture } from "./test-support";
import { latestUpdate, UpdateManifestSchema } from "./updates";
const manifest = { version: "0.1.5", notes: "Changes", pub_date: "2026-11-12T12:00:00.000Z", platforms: { "darwin-aarch64": { url: "https://github.com/jpoindexter/heel/releases/download/v0.1.5/Heel.app.tar.gz", signature: "test-signature" } } };
it("serves only the release manifest, never private reports", async () => {
  const test = receiverFixture();
  expect((await latestUpdate(test.env)).status).toBe(204);
  test.db.prepare("INSERT INTO update_feed VALUES ('latest', ?)").run(JSON.stringify(manifest));
  const response = await latestUpdate(test.env);
  expect(response.status).toBe(200); expect(await response.json()).toEqual(manifest);
  test.db.close();
});
it("refuses a mismatched version or foreign download and fails closed on corrupt storage", async () => {
  expect(UpdateManifestSchema.safeParse({ ...manifest, version: "0.1.6" }).success).toBe(false);
  const test = receiverFixture();
  test.db.prepare("INSERT INTO update_feed VALUES ('latest', 'invalid')").run();
  expect((await latestUpdate(test.env)).status).toBe(503);
  test.db.close();
});
