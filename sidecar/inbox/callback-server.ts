import http from "node:http";
import { parseCallback, type Callback } from "./oauth";

const LOOPBACK = "127.0.0.1";
const PAGE = "<!doctype html><meta charset=utf-8><title>Heel</title><p style=\"font-family:system-ui;margin:3rem\">You can close this tab and go back to Heel.</p>";

export type CallbackServer = { redirectUri: string; result: Promise<Callback>; close: () => void };

/** A one-shot listener on 127.0.0.1 for Google's redirect. It only accepts the state we made, and gives up after `timeoutMs`. */
export function startCallbackServer(expectedState: string, timeoutMs: number): Promise<CallbackServer> {
  return new Promise((resolveServer, rejectServer) => {
    let settle: (callback: Callback) => void = () => undefined;
    const result = new Promise<Callback>((resolve) => (settle = resolve));
    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(PAGE);
      settle(parseCallback(req.url, expectedState));
    });
    const timer = setTimeout(() => settle({ ok: false, message: "Nothing came back from Google in time. Try Connect again." }), timeoutMs);
    const close = () => {
      clearTimeout(timer);
      server.close();
    };
    void result.then(close);
    server.once("error", rejectServer);
    server.listen(0, LOOPBACK, () => {
      const address = server.address();
      if (address && typeof address === "object") resolveServer({ redirectUri: `http://${LOOPBACK}:${address.port}/callback`, result, close });
    });
  });
}
