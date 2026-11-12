# Onboarding and direct reports

Outcome: a new user gets one useful action from Heel; feedback/debug/crash reports submit from the app and receive a real delivery receipt.

Target: the native panel, existing Brain settings and task creation, Settings feedback/debug, and the crash boundary.

Must: short skippable first-run guidance; persist progress; replay from Help; explain AI/privacy/approval behavior; preview optional diagnostics; preserve drafts after failure; one report per submission ID; show success only after the receiver stores it.

Must not: open a mail app, embed service credentials, upload tasks/chat/mail/CV contents as diagnostics, reset live user data, or claim delivery from an HTTP connection alone.

Now: 0.1.5 is published; browser and isolated native flows, private report receipts, public downloads and update feed have been verified. Next release: follow docs/RELEASE.md and preserve the signing key.

Authority: requested onboarding and direct in-app debug sending. Existing maintainer destination is Jason; use a private feedback destination, without public debug issues or unrelated project changes.

Done evidence: native first run leads to a real task; dismissal survives restart; Help reopens guidance; native feedback/debug reaches the private receiver and can be read back by its receipt ID; failures keep the draft and report no success; retries do not duplicate reports. Keep synthetic test reports separate from user data.

Re-entry: check current git state, then this guide and the feedback receiver configuration. The Cloudflare receiver and private D1 database are deployed.

## Hosted delivery

The receiver is deployed at `https://heel-feedback.jason-poindexter.workers.dev`. Reports go to a private EU-jurisdiction Cloudflare D1 database (`heel-feedback`); only the POST response exposes a receipt. The fixed email destination is verified `jason@theft.studio`. Cloudflare accepted a real synthetic notification and returned a message ID; inbox arrival was not independently observed. No root MX record or existing Google mail routing was changed. No paid plan was enabled.

Deploy from `feedback-service` with `npm run build` and `node_modules/.bin/cf deploy`. The official Cloudflare CLI keeps its authorization outside this repository. Report rows remain available when email delivery fails or is uncertain; retrying an identical UUID does not notify again. Public submissions are limited to five per IP per minute and 100 total per day. These limits bound abuse; the endpoint is intentionally public so testers need no account.

## Report popups and crashes

Settings › About opens feedback in a dedicated modal, with bug/idea choice, saved drafts, separate diagnostic facts and recent-event switches, an exact preview and explicit Send. Recent events are off by default. Debug opens its own report popup. Closing a popup keeps a feedback draft; an ambiguous send keeps the exact immutable report ID for retry.

React render failures retain a recovery screen with Reload and a crash-report popup. Uncaught background failures offer Report. A native running-session marker detects an unexpected process exit; next launch offers a persistent crash-report popup. This can also represent force quit or power loss. It does not collect OS crash dumps, stack traces, raw helper logs or private content, and never sends automatically. A clean quit removes the marker. Synthetic native kill testing uses only the isolated test bundle and data directory.

Executed evidence is recorded in [0.1.5 verification](verification/heel-0.1.5.json).
