# Job applications — 0.1.4

Heel now has a browser application workflow. Ask Heel to prepare an application with the exact job URL, then press **Review application**, or open **Job applications** on Today.

1. Supply applicant facts, or add a CV and use its extracted text as facts. PDF, DOC, DOCX and TXT files are supported up to 5 MB each (five attachments). In 0.1.4, PDF text extraction and scan OCR use a native reader bundled with Heel; no Apple command line tools, Python, OCR package or model download is required. PDFKit reads each page's text; Vision OCR handles pages without a text layer, including mixed text/scan documents. Review recognized text for mistakes. PDFs must be unlocked and have at most 50 pages. Combined facts are limited to 20,000 characters.
2. **Fill from my facts** sends facts and page descriptions to the selected AI. If standard editable fields are unavailable, it automatically switches to screenshot-based browser control. Its answers are suggestions: inspect and correct them, then **Save corrections to form**. A quoted source is checked for existence, not semantic correctness.
3. Attach the intended CV to the site's file control. For sites that upload immediately, the actual upload request waits for review.
4. Choose the site's Next or Submit control. Mark final submission for the last step, then **Review next step/submission**. **Allow once** releases only the exact held request shown in the preview. Some site reads/navigation requests also need approval. **Deny and cancel** aborts waiting requests.
5. A successful HTTP response plus a newly observed application confirmation produces the receipt. Without confirmation, Heel reports uncertainty and does not retry. An uncertain result must be checked at the destination before starting another application.

Chrome, Brave or Edge is required when Playwright's bundled Chromium is unavailable. Heel uses its own browser profile, with its own site logins. Sign-in and human verification are performed by the person in that visible browser. WebSocket/service-worker workflows, unreadable request bodies and certain write redirects can require a handoff; this is not a guarantee of compatibility with every website.

## General browser capability

The implementation has no per-ATS adapter or job-site allowlist. Standard DOM controls are the efficient path. **Help with an unfamiliar page** can inspect a screenshot, click, type, use bounded keyboard shortcuts, scroll and operate a custom file chooser. It is available even on mixed native/custom pages. Each action follows a fresh observation, quoted applicant facts are required for typing, and the same outgoing-request approval gate still applies. Visible password/one-time-code fields stop assistance before a screenshot is sent to the AI.

Visual assistance uses at most six actions per run and a 90-second model deadline, with a no-progress stop. A vision-capable model is required. The real Codex image path has been exercised; the other five provider adapters have image-format contract tests, not live-account verification. Temporary Codex screenshots use private files and are removed when the call ends normally. The provider formats follow [OpenAI image inputs](https://developers.openai.com/api/docs/guides/images-vision), [Anthropic image inputs](https://platform.claude.com/docs/en/build-with-claude/working-with-messages#vision), [Mistral vision](https://docs.mistral.ai/inference/conversations/vision) and [Ollama chat](https://docs.ollama.com/api/chat).

If the destination's acceptance message is not recognized, Heel keeps the result uncertain. The person can copy a newly observed site acceptance message in any language and explicitly affirm it. The saved receipt then says **You confirmed**, distinguishing human observation from automatic recognition. This never resends the application.

Ordinary text inputs, selects, multi-selects, radio/checkbox controls, textareas, accessible custom comboboxes, shadow DOM and frames are covered by the generic inspector. The form shows at most 150 controls per frame and 80 site controls per frame; very large or inaccessible forms need browser review. The application is bounded to 60 actions, eight pending requests and five minutes per pending request. A helper restart invalidates review authority. Cancellation remains reachable while a fill/action is active.

Records, CV bytes and a separate browser profile live under `applications/` in Heel's data folder. Credentials in recognized password/token fields are redacted from request previews and saved receipts. Backups include records and attachments but exclude the browser login profile. Wipe closes the browser and removes application data through the existing confirmed wipe. Logs do not include application contents.

## Vanta reuse

- `sidecar/applications/launch.ts` adapts `Vanta-iris-test-20261111/vanta-ts/src/browser/launch.ts`: installed Chrome/Brave/Edge fallback and owned profile lifetime.
- `src/applications/RequestReview.tsx` adapts the structured subject/content and Allow once/Deny pattern from Vanta's approval overlay, using Heel's Radix controls.
- Vanta's generic click-risk classification was not used as proof that an application was submitted. The request gate, durable one-use consumption and confirmation checks are part of this Heel change. Vanta's source and private profiles were not modified.

## Executed proof

Run `npx tsx scripts/application-e2e.ts --real-codex --chat` (add `--headed` for visible browser windows). It uses a temporary profile, the real Heel panel and guarded helper, the real Codex provider, a controlled two-step site and synthetic applicant details. It checks natural-language preparation, AI fill, manual correction, CV bytes, zero application writes before approval, one final submission, a confirmation receipt and 300×420 layout overflow.

Proof: [end-to-end JSON](proofs/applications-2026-11-11/end-to-end.json), [review before approval](proofs/applications-2026-11-11/01-review-before-approval.png), [submission review](proofs/applications-2026-11-11/02-submit-review.png), [confirmation](proofs/applications-2026-11-11/03-confirmation.png).

The general fallback was then exercised with `npx tsx scripts/application-e2e.ts --real-codex --visual`. The standard Fill button automatically chose vision for a randomly positioned canvas with no text-input DOM or accessible submit button. Real Codex entered the name, used the custom CV picker and prepared the final request; the destination received zero requests before approval and exactly one application/CV afterwards. [Visual proof](proofs/applications-2026-11-12/visual-end-to-end.json) · [request review](proofs/applications-2026-11-12/01-visual-review.png) · [confirmation](proofs/applications-2026-11-12/02-visual-confirmation.png).

`npx tsx scripts/application-e2e.ts --confirm-foreign` also exercised the UI's person-observed French acceptance path without repeating the submission. [Foreign-language proof](proofs/applications-2026-11-12/foreign-confirmation.json).

Browser integration tests additionally exercise AJAX uploads/denial, missing required answers, stale authority, changed CV bytes, interrupted restart, an ambiguous outcome, iframe/shadow controls and accessible custom/multiple selects. PDF tests execute local text extraction from an actual synthetic PDF. These checks do not establish behavior on Iris's real target ATS, other Macs or other browser versions.

The packaged helper was separately launched from the .app on a temporary profile: its copied Playwright dependency loaded, an installed browser opened `https://example.com`, and cancellation closed it. See [packaged-helper proof](proofs/applications-2026-11-11/packaged-helper.json).

The full suite includes the design-token and code-size gates. Release signing and distribution evidence belongs in [RELEASE.md](RELEASE.md); the earlier ad-hoc ZIP is a local test artifact.

The startup-cancellation regression was first observed failing, then exercised after the fix: cancelling or wiping while browser launch is pending waits for that launch to close, and the cancelled open cannot recreate an active application afterwards.

Final 2026-11-12 verification: **154 test files / 785 tests passed**, along with typecheck, design-token/code-size gates, whitespace check and the native .app build. [Packaged screenshot-assistance proof](proofs/applications-2026-11-12/packaged-vision.json) records the helper digest.

The compiled native Tauri panel was operated through macOS accessibility controls with real Codex, an isolated bundle identifier (`studio.theft.heel.native-proof`) and a controlled local destination. The native file picker attached the CV. The destination received zero requests before the first approval, zero final submissions before the final approval, and exactly one final application with the corrected name, cover letter and CV afterwards. Heel visibly displayed `Application received. Reference HEEL-TEST-001.` See [native end-to-end proof](proofs/applications-2026-11-12/native-end-to-end.json), [first review](proofs/applications-2026-11-12/native-before-first-approval.json) and [final review](proofs/applications-2026-11-12/native-before-final-approval.json).

### PDF/OCR follow-up in 0.1.4

The native `studio.theft.heel.pdf-proof` release bundle automatically started its packaged helper with `DEVELOPER_DIR` pointing at a nonexistent folder. Through the macOS file picker and **Use … as facts**, both a text PDF and an image-only scanned PDF populated the native facts field. The original unsaved note was preserved; the scan included an email and French accents. No AI was configured or invoked, and no outgoing site request was approved. The first packaged OCR run was slower than the development checks but completed within the 45-second deadline. See [native text proof](proofs/pdf-ocr-2026-11-12/native-text.json) and [native OCR proof](proofs/pdf-ocr-2026-11-12/native-ocr.json).

The regression first failed with the old compile-on-the-user-Mac reader, then passed with the bundled reader. Real PDF tests cover native text, scanned pages, mixed documents, blank/locked files and the 50-page limit. A browser-service integration test verifies that failed extraction leaves previous facts intact. Full suite: **154 files / 792 tests passed**, with typecheck. Fixtures contain only synthetic data; regenerate them with `swift scripts/fixtures/cv-pdfs.swift sidecar/applications/fixtures` on the developer's machine. OCR accuracy on Iris's own CV and other Macs remains unverified. The reader caps raster dimensions at 2400 pixels and extracted text at 20,000 characters, with a 45-second process deadline; difficult documents can require pasted facts.

After stopping the harness, the native release test bundle automatically started its own bundled production helper. That helper opened a public HTTPS page through the copied Playwright dependency; cancellation closed the application browser and quitting the native app removed the helper connection. [Native packaged-startup proof](proofs/applications-2026-11-12/native-packaged-startup.json). Reproduce the controlled native test using `npx tsx scripts/application-native-harness.ts` and an isolated native build; never point that harness at the production app identifier. Arbitrary live ATS behavior and other Macs remain unverified.
