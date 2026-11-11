# Direct job applications — tester report, 2026-11-11

Historical triage of 0.1.2. The later local 0.1.3 candidate implements a browser workflow; see [implementation and executed proof](APPLICATIONS.md). The diagnosis below describes the original shipped architecture.

## Report and evidence limits

Iris reports that Heel 0.1.2, using the Codex brain, tells her to apply for jobs manually. The supplied privacy-preserving report shows the helper running; it contains no conversation, job URL, provider request, or refusal text. Its SQLite experimental warning does not identify a submission failure. The exact reply and its wording have not been reproduced.

## Current implementation

- `sidecar/agent/providers/codex.ts`: completion invokes `codex exec --ephemeral --ignore-user-config --ignore-rules --sandbox read-only`. The user's Codex configuration is not a source of browser integrations for Heel.
- `sidecar/agent/actions.ts`: the model can propose only the enumerated typed actions. There is no browser navigation, form filling, attachment upload or application submission action.
- `sidecar/agent/turn.ts` and `sidecar/agent/execute.ts`: one completion is parsed, then the app executes validated actions. This is not a browser plan/act/observe loop.
- `sidecar/agent/prompt.ts`: the protocol offers documents, PDFs and email drafts, and explicitly says the agent cannot send. An email draft is not a submitted application.

Finding: the report matches a missing execution capability in the shipped architecture. It is not evidence that the helper is down or that a job website rejected a submission. Loosening the sandbox or changing refusal wording alone would not implement job applications.

## Where the previous chats stopped

The chat **Desktop AI agent for task management** ended its implementation history with the tester release; attempts to investigate this report failed during context compaction. The chat **Create Heel mascot states** records the signed/notarized 0.1.2 release and remaining native findings: Help's invisible keyboard focus outline and feedback reporting an opened email without an observed draft through the Brave mail handler. Neither history records a browser application feature.

Release evidence and native follow-up: `handoffs/codex-to-claude-notarize-release-2026-11-05.md`. Older roadmap entries are not evidence that those native findings were fixed.

## Smallest implementation boundary for direct applications

Start with one supplied job URL and the applicant's supplied CV/details. Add an explicit browser execution path that can inspect the real form, fill it, attach the intended CV, and show the prepared application for review. Bind any submission approval to that job, applicant, attachment and final answers. Report missing information, sign-in or verification barriers without inventing answers. Preserve the existing task/document/mail behavior and support cancellation.

The change must reach the action contract and validation, execution loop/browser adapter, provider integration, review/status UI, failure and retry handling, fixtures/tests, and Help/capability copy. Changing the provider sandbox alone is insufficient.

Done criterion for a future implementation: through Heel's real UI, prepare one application against a controlled test form, review it, submit with explicit authority, observe the destination's confirmation, and retain that confirmation as the receipt. Also exercise cancellation, a missing required answer, an attachment failure, and an uncertain submit result without blindly resubmitting. A green build or a document/email draft does not meet this criterion.

## Re-entry

Implement the controlled test-form path first. Iris's original job URL and exact response would help distinguish wording issues and site-specific barriers, but are not needed to establish the missing browser capability above.

## Checks executed

`npm test -- sidecar/agent/providers/cli-providers.test.ts sidecar/agent/actions.test.ts sidecar/agent/turn.test.ts sidecar/agent/execute.test.ts` — 4 files, 46 tests passed. These exercise the existing provider contract with fake CLI dependencies, action validation, turn handling and action execution. They do not reproduce Iris's conversation, execute a live Codex completion or establish browser submission behavior.
