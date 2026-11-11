# Job applications: implementation and proof

Owner: Jason. Applicant: Iris. Outcome: fill a job application from supplied facts/CV, correct and review it, approve the exact outgoing request, observe the site's confirmation.

Reported evidence: Heel 0.1.2 refuses direct applications. Observed source: no browser execution path. Assumption to test: accessible DOM controls cover a useful range of sites. Arbitrary ATS compatibility requires site evidence; it cannot be inferred from one fixture.

Now: add browser inspection, editable fields, attachment staging and a request approval gate. Next: wire a dedicated application workspace and chat entry point. Later: run the real UI against a controlled multi-step form, including attachments, correction, cancellation, stale approvals and uncertain outcomes.

Constraints: preserve live user data and existing actions; use a separate visible browser profile; no fabricated applicant facts; never automate login/CAPTCHA; no outgoing write request without a review-bound approval; durable consumption before network release; no automatic submission retries. Website content is untrusted data. Browser launch, page actions, pending requests and model calls are bounded.

Scope reaches shared contracts, action validation/execution/prompt, browser service and private persistence, guarded helper routes, review UI, attachment picker, packaging, shutdown/data wipe, Help, test fixtures and end-to-end proof. Reuse Radix controls and the existing layer/client conventions. Playwright Core is the browser transport; installed Chrome supplies the executable.

Done evidence: use Heel's UI to open a two-step form, fill supplied answers with a provider, upload a synthetic CV, correct an answer, stage Next and final Submit, observe zero server writes before approval, then exactly one application with the intended fields/file and an observed confirmation. Check cancellation, duplicate/stale approval, missing fields, browser closure, interrupted restart and an ambiguous submit outcome. A packaged helper must load the browser dependency. Record failures and coverage limits here.

Re-entry: run `npm run typecheck`, then the application tests and end-to-end script. Keep runtime proof separate from unit tests and broad ATS compatibility claims.

Implemented and exercised: see [workflow and proof](APPLICATIONS.md). Live Codex was used through the natural-language chat entry point and panel against a controlled two-step form. The full suite and typecheck were run. The compiled native panel then exercised AI fill, correction, the macOS CV picker, both approval boundaries and a confirmed single submission. Native automatic packaged-helper startup was also exercised using an isolated bundle identifier. Iris's actual ATS and other Macs remain separate acceptance gates.

2026-11-12 scope correction: the desired capability is a general browser operator, with no per-site integration requirement. Added image input across the six existing provider adapters, automatic screenshot fallback when standard fields are unavailable, bounded page assistance, custom chooser/keyboard/scroll controls and a language-independent person-observed confirmation path. Live Codex exercised the custom canvas path through the normal Fill button. Other providers' image formats have contract tests; live-account behavior remains unverified.
