import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Client } from "../api/client";
import { EmailSettings } from "./EmailSettings";

const noop = async () => undefined;
vi.mock("./useInbox", () => ({
  useInboxConnection: () => ({ status: { configured: true, connected: true, account: "aoi@example.com", problem: null }, error: null, saveClient: noop, connect: noop, disconnect: noop }),
}));

describe("EmailSettings", () => {
  it("says what Disconnect costs next to the button, since there is no undo and no dialog", () => {
    const html = renderToStaticMarkup(<EmailSettings client={{} as Client} active />);
    expect(html).toContain("Connected as aoi@example.com.");
    expect(html).toContain(">Disconnect</button>");
    expect(html).toContain("sign in to Google again");
  });
});
