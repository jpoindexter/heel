# Handoff: Codex → Claude — Heel v0.1.2 notarized and published; two native findings

Date: 2026-11-05T12:37:48+01:00
Project: `/Users/jasonpoindexter/Documents/GitHub/Greg agent`
Input: `handoffs/claude-to-codex-notarize-release-2026-11-05.md`

## Result

**The notarization/release objective is executed and verified. The two requested native acceptance checks both have findings; do not call them passing.**

Published prerelease: https://github.com/jpoindexter/heel/releases/tag/v0.1.2
Download: https://github.com/jpoindexter/heel/releases/download/v0.1.2/Heel_0.1.2_aarch64.dmg

Apple accepted the submission, the DMG and app are stapled, Gatekeeper accepts both, and GitHub's asset digest matches the local DMG. Help's keyboard focus indicator is absent. Feedback reports a draft open even though this Mac's Brave email-link handler did not create a visible draft. These limitations are included in the release notes and tester docs.

## Read first and current state

Read the original input handoff, `docs/RELEASE.md`, `docs/TESTERS.md`, then the evidence below. Applicable AGENTS.md instructions were supplied in chat; no project AGENTS.md file was found. The historical `docs/04-technical/model-and-effort-routing.md` reference is absent. No Claude CLI or additional agent invoked.

Source changes were limited to the authorized version and release-doc files. Main is pushed. Private `assets/`, `handoffs/` and `graphify-out/` were not staged or published. No application feature source changed in this release.

## Credentials and notarization — executed

Jason personally entered the new app-specific password in Terminal and received validation/save success. Codex never received, typed, retrieved or stored the password.

- Step 0: `xcrun notarytool history --keychain-profile heel` succeeded, exit 0. Earlier missing-profile/401 blocker is resolved.
- Signing identity: `F146F8A6C9E1BC060AE312AA6F4C6D75522C8D75`, Developer ID Application: Jason Poindexter, team `5352PXMNV5`.
- Build: `APPLE_SIGNING_IDENTITY=… HEEL_NOTARY_PROFILE=heel npm run release:signed`, exit 0.
- Submission: **`16e264a2-6cc9-430d-a648-d7e1b693220c`**, status **Accepted**.
- Both `xcrun stapler validate` commands returned **The validate action worked!**

Actual Gatekeeper output:
```text
src-tauri/target/release/bundle/dmg/Heel_0.1.2_aarch64.dmg: accepted
source=Notarized Developer ID
origin=Developer ID Application: Jason Poindexter (5352PXMNV5)

src-tauri/target/release/bundle/macos/Heel.app: accepted
source=Notarized Developer ID
origin=Developer ID Application: Jason Poindexter (5352PXMNV5)
```

Tauri's earlier “skipping app notarization” line is expected for this script: Tauri built/signed without APPLE_* password variables, then the script submitted the DMG using the Keychain profile, stapled both and assessed both successfully. Do not misread the intermediate warning as the final result.

## Exact published candidate

- App: `/Users/jasonpoindexter/Documents/GitHub/Greg agent/src-tauri/target/release/bundle/macos/Heel.app`.
- App version: **0.1.2**, independently read from Info.plist.
- Executable SHA256: `daba5c6f4c8c139e35be24633402c463281f5db7001d3b6f8f4f95ac55d4f320`.
- DMG: `src-tauri/target/release/bundle/dmg/Heel_0.1.2_aarch64.dmg`.
- DMG SHA256: **`f6026c77a0ce2c36ed8adcab4b3a295fb4c6f361891b267e6b62bce9127ab976`**, 41,276,276 bytes.
- GitHub returned digest `sha256:f6026c77a0ce2c36ed8adcab4b3a295fb4c6f361891b267e6b62bce9127ab976`; exact equality asserted.
- Built from source commit `5338adb40d527e7ba14eb4e9a663faf3412d8cf0`; release tag targets the later docs-only commit shown below. No executable source changed between build and publication.

Commits pushed:
```text
1eff38c203b4c93dd9eb16229bb9844a85c95380 docs: v0.1.2 notarized
5338adb40d527e7ba14eb4e9a663faf3412d8cf0 chore(release): 0.1.2
```

v0.1.1 body, asset names/digests/sizes were read back unchanged. v0.1.0 was never modified. No force push or asset replacement.

## Native checks on this actual build

| Check | Verdict | Executed evidence and remaining finding |
|---|---|---|
| Settings › Help | **Fail — focus indicator** | Nine topics observed. Tab reached each; alternating Space/Enter opened and closed numbered steps in both light and dark. Text wraps; long content remains available by scrolling. **No visible keyboard focus ring in either theme.** `src/settings/settings.css` references `var(--focus-ring-width)`, but that variable has no definition in `src/design/tokens.css` or the Radix themes stylesheet. Runtime absence plus source evidence identifies the narrow issue. No source patch made in this release-only task. |
| Settings › About › Send feedback | **Fail in this Mac's current configuration** | Chose Something broke, title `Codex check — ignore`, one harmless test sentence, debug switch on, then clicked Write the email. Heel cleared fields and reported “An email to jason@theft.studio is open in your mail app…”. **No compose window appeared in Mail or Brave.** Both NSWorkspace and LaunchServices identify Brave as default mailto handler. Mail's Window menu showed only its existing inbox; Brave's windows/tabs showed no feedback draft. OS-open success is not proof of a composed email. Actual To/subject/body/debug exclusion in a draft therefore remain unverified. Nothing sent; no draft found to delete; no existing draft deleted. Default email handler unchanged. |

Tab initially did not advance under background AX targeting. A direct click on the panel header gave the window keyboard focus, after which Tab worked. macOS Keyboard navigation was briefly enabled during diagnosis and restored off before the successful full topic sequences; `defaults read -g AppleKeyboardUIMode` returned the original 0. Do not claim the initial input-targeting ambiguity itself was an app failure.

System appearance baseline was System; restored System after dark testing. All Help topics/settings groups collapsed and panel hidden before stopping the app.

## Evidence

All paths below are relative to `/Users/jasonpoindexter/Documents/GitHub/Greg agent/handoffs/release-0.1.2-evidence-20261105T112226Z`:
- `notary-profile-history.json`, `build-notarize.log` — real authentication/build/submission output.
- `artifact-verification.json`, `stapler-app.txt`, `stapler-dmg.txt`, `gatekeeper-app.txt`, `gatekeeper-dmg.txt` — independent post-build checks.
- `public-release-verification.json`, `previous-release.json`, `publish-result.txt`, `release-notes.md` — publication/readback.
- `help-initial.png`, `help-light-01.png` through `help-light-09.png`, `help-dark-01.png` through `help-dark-09.png`, `help-dark-focus-before.png`, `help-dark-09-bottom.png`, matching AX — actual native Help rendering and content.
- `help-keyboard-checks.json`, `help-dark-keyboard-checks.json`, `help-verdict.json` — per-topic native keyboard assertions and failed focus-ring criterion.
- `feedback-filled.png`, `feedback-opened-status.png`, matching AX, `feedback-verdict.json` — UI test, truthful partial evidence, no actual draft claimed.
- `keyboard-navigation-before.*`, `keyboard-navigation-on.*`, `keyboard-navigation-restored.*`, `native-cleanup-panel-hidden.*` — temporary setting and cleanup.
- `data-baseline.json`, `data-after-comparison.json`, `trello-comments.json` — preservation and readback.

Private UI evidence/data copies stay local; never blanket-add/publish this directory.

## Data preservation — executed

Fresh backup before launching: `/Users/jasonpoindexter/Library/Application Support/studio.theft.heel-check-backups/release-0.1.2-20261105T112352Z`. Six explicitly named files copied with matching hashes; separate online SQLite copy integrity_check=ok. No Heel process was running at baseline.

Only one Heel process ran: PID **84548**, exact release bundle path. After tests, SIGTERM sent to that PID. App exited, helper listener on port 62485 disappeared, and sidecar.json was removed. No broad process kill.

Every database table's row count, canonical row hash and `.dump` hash matches the baseline copy: tasks 2, messages 8, documents/parked/focus/ledger 0, settings 2, migrations 6. Main DB bytes unchanged. No table restore or real-record mutation.

Preferences: mascot-hidden, panel-size-v2 and shell-settings match baseline bytes. **panel-place.json changed from undocked x1794/y176 to undocked x1400/y282**. No intentional drag or resize; cause not established. This is a finding, not grounds for automatic restore. Original is preserved in backup. sidecar.log changed from the normal helper startup. Appearance and system keyboard preference restored through their UIs. No data file deleted or overwritten from backup.

## Automated checks and scope

- Version consistency updated only in package.json, package-lock.json root entries, shared/version.ts, Cargo.toml, Cargo.lock and tauri.conf.json.
- `cargo update -p heel --offline`: updated only Heel 0.1.1 → 0.1.2.
- Full Vitest: **758 passed, 147 files**.
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- Signed release command: exit 0; notarization/stapling/Gatekeeper and asset digest independently checked.
- Nonfatal: existing Vite chunk-size warning; pre-commit gitleaks hook skipped because gitleaks is not installed. The narrow version/doc diffs were reviewed; no full new secret scan claimed.

Not run: a second Mac installation, real provider connection, actual feedback send, crash-screen draft check, broader accessibility conformance, or a rerun of the previous October ten-check suite on this new candidate. Do not carry the old ten passes forward as fresh evidence here.

## Trello — two comments, read back

One comment each, no card moves or description/status edits:
- V1-10: `ari:cloud:trello::action/6aec6a2f9e4c92c6f06978d0` — notarization and published digest confirmed; another-Mac install unverified.
- T1 TESTER RELEASE: `ari:cloud:trello::action/6aec6a31b4f83546d45d573d` — both native findings, no send, data preservation and next fixes.

Each saved comment was read back and matched the submitted text. No duplicate/retry write.

## Claude: next exact task

1. Review the two native failures. For Help, define the missing focus width in the existing token file and verify the ring is visible under actual Tab navigation in light/dark. Reuse existing focus color/spacing; no redesign.
2. Investigate the feedback success contract for mailto handlers that accept the URL but produce no draft. Preserve the fixed recipient and no-send rule. Make success wording/fallback accurate; validate an actual draft's To, subject, body headings, debug content and cleanup with a properly configured mail client. Never delete an unrelated draft.
3. Investigate saved panel-position movement only if reproduced; preserve the recorded baseline and current user state.
4. Any executable source change needs a new candidate with rerun tests/native checks and signing/notarization. v0.1.2 is already public: do not replace its asset; use a new version for a corrected release.

Return focused fixes and executed proof, clearly separated from any remaining unknowns. No artwork, Vanta integration, dependencies or unrelated platform work.

Skills applied: use, own-a-job, deployment-patterns, claude-codex-handoff, dec-accessibility, dec-quality-testing.
