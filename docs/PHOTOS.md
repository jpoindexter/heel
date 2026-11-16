# Photos

Outcome: select, paste or drop a photo; see it; ask about it/read its text; crop, rotate or resize it; remove its background or request a generative edit; save a new copy without overwriting the source.

Now: implemented and exercised in the React workspace, real helper, live Codex subscription and isolated packaged macOS app. Vanta's clipboard deduplication and bounded attachment patterns were adapted; Heel reuses its existing vision providers and bundled native reader. No reusable generative edit endpoint was found in the inspected Vanta checkout.

Next: release only when requested. Source remains 0.1.5; the isolated native proof bundle used a 0.1.6 version override to avoid the production updater interfering with tests.

Must: original files unchanged; explicit send before any provider upload; no credentials or private photo bytes in logs/reports; bounded image decoding/payloads; preserve the selected image on failures; edited output is a separate copy. Missing subscription sign-in/model support must be actionable and never reported as a successful edit.

Authority: user requested all three photo feature groups and reuse from Vanta. No Vanta profiles, conversations, credentials or databases are copied. No release is published as part of this request unless instructed.

Done evidence: real photo pixels reach a vision provider; photo preview/paste/drop works; local transforms produce expected dimensions/pixels; native foreground removal returns transparent background; a generative edit returns a viewable image when the configured provider is available; save/reopen retains the edited image; original remains unchanged. Record gaps separately from mock/contract tests.

Re-entry: git status, this file and [executed evidence](verification/photos-2026-11-16.json); run the checks below before preparing a release.

User correction: generative edits must use the Codex ChatGPT subscription, not an API key. Installed Codex 0.163.0 exposed image_generation and executed a real synthetic edit successfully. The app uses that supported CLI tool path; no fallback API billing or credentials are introduced.

## Implemented behavior and limits

Photos opens from Today. Import via picker, drop or paste; select among up to four images. The bundled native ImageIO decoder handles PNG/JPEG/HEIC/WebP/TIFF and the first GIF frame, corrects orientation, and creates a metadata-free PNG working copy fitting 2048 pixels. Original files are untouched. Resize outputs are limited to 4096 pixels per edge and a 20 MB encoded image. Undo retains the last three edits; closing the Photos layer preserves open images, while quitting requires saving a copy first.

Text reading and foreground removal use Apple Vision locally. Asking sends only the selected working photo and question through the chosen existing vision provider. Generative editing uses the installed Codex CLI signed in through ChatGPT, with its built-in image-generation feature. No API key or API-billed fallback is used. Calls are ephemeral, ignore user configuration/rules, disable shell/view-image/apps tools, and restrict tool file access to the temporary reference folder and Codex's generated-image output. A synthetic out-of-scope read was actually denied by Codex. Returned bytes are taken from the CLI's own thread-scoped artifact directory and decoded as an image; assistant-invented paths cannot read arbitrary files.

Saving explicitly creates a uniquely named, owner-only PNG on Desktop and reveals it in Finder. Source files cannot be overwritten by this route. Codex also retains its generated image in its own generated_images directory; Heel's data wipe does not delete Codex's files. No photo bytes, names or image text are added to diagnostic uploads.

## Executed verification

- Typecheck and the complete Vitest suite: 164 files, 810 tests passed.
- `npx tsx scripts/photo-workspace-e2e.ts`: actual React UI and guarded helper, native pixels, picker/paste/drop, proportions/crop/clockwise rotation, undo/reset, save and reopen. Vision and generation adapters are controlled doubles in this check.
- `npx tsx scripts/photo-live-proof.ts /path/to/a/clear-subject-photo.jpg`: actual subscription vision and generative edit use a synthetic fixture. The supplied subject photo goes only to local Apple Vision; transparent and opaque output pixels are asserted. Requires a macOS development host and signed-in Codex, no API key.
- Isolated packaged native app: picker import, rotate/undo, actual subscription edit changing a blue circle to green, Desktop export, quit/relaunch, reopen the edited PNG and local text reading returned `BLUE 7`. Exported pixels contained green and red with no remaining blue.
- An out-of-scope synthetic file read was denied by the Codex filesystem policy.

One initial packaged OCR attempt failed without a diagnostic cause. The same packaged binary and helper then succeeded; the final native UI also succeeded. Local OCR retries once on failure, preserving cancellation. This mitigation does not establish the cause of the first failure.

Not exercised: Iris's Mac, Intel hardware, a host without developer tools installed, VoiceOver, every supported source format, or a new signed/notarized distribution. PNG and real HEIC imports were exercised. Subscription access and image-tool availability can differ between accounts and Codex versions; unavailable access returns an error and preserves the current photo.
