# Handoff: Codex → Claude — all ten step-1 checks verified

Date: 2026-10-30T15:46:11+01:00
Project: `/Users/jasonpoindexter/Documents/GitHub/Greg agent`
From: Codex · To: Claude

## Result and exact candidate

**10 Pass / 0 Fail / 0 Not verified for the ten scoped scenarios, all executed against the same rebuilt native Heel.app.** Four checks were verified in the preceding follow-up; the remaining six have now been rerun on that exact binary. No rebuild, relaunch, source change or process replacement occurred between those verification batches.

- App: `/Users/jasonpoindexter/Documents/GitHub/Greg agent/src-tauri/target/release/bundle/macos/Heel.app`
- Binary SHA256: `16cab434b1691081a0c9f84f37eb557bc22b40da774f939eda290ed979d9526a`
- Same single running PID: `84328`.
- Base HEAD: `67ab021c728f7e0c74dbd65ae6f857f9c2f4bab5` plus the four uncommitted frontend files listed below.
- Final machine-readable result: [step1-six-checks-20261030T144022Z/ten-check-verdict.json](step1-six-checks-20261030T144022Z/ten-check-verdict.json).

This supersedes the historical 6/10 result and the previous four-check follow-up. The original checklist had two corrected criteria: check 1 follows B9's actual floating-versus-parked specification, and check 7 uses the new missing-key setup actions so check 8 is reachable. These are explicit intended behaviors, not literal passes of the contradictory original wording.

## All ten native checks — executed

Evidence roots relative to `handoffs/`:
- **A** = `step1-fixes-evidence-2026-10-30-20261030T124450Z/` (four requested fixes/checks, same candidate).
- **B** = `step1-six-checks-20261030T144022Z/` (remaining six, fresh rerun).

| # | Verdict | Scenario and observed result | Evidence |
|---|---|---|---|
| 1 | **Pass** | With Always on top enabled, Greg and panel stayed above activated TextEdit: layer 5 versus layer 0 in the composed desktop and CGWindowList. Restored off: parked/undocked panel returned behind TextEdit at layer 0, Greg remained layer 5. This is the specified distinction. | A: `01-floating-check.json`, `01-normal-window-check.json`, `01-textedit-front-floating.desktop.png`, `01-textedit-front-normal.desktop.png`, matching window snapshots |
| 2 | **Pass** | Genuine HID double-click through Greg's transparent corner selected the harmless TextEdit fixture marker; TextEdit remained frontmost and Heel panel hidden. Positive opaque-body control hit Heel, opened panel and brought Heel forward. Cursor restored by the bounded probe. | A: `02-real-click-verdict.json`, `02-body-control-verdict.json`, `02-real-after.desktop.png`, `02-body-control.desktop.png` |
| 3 | **Pass** | Actual macOS Dock accessibility tile count for Heel changed 1 → 0 → 1 on toggle off/on. Single PID 84328 unchanged throughout. Final Dock on. | A: `03-dock-verdict.json`, `03-dock-before.txt`, `03-dock-off.txt`, `03-dock-on.txt`, process/window snapshots |
| 4 | **Pass** | Enabled Open Heel when you log in in the UI; actual System Settings > Login Items & Extensions listed Heel.app. Disabled it; same live system list removed Heel.app and app switch read off. | B: `04-login-enabled.png`, `04-system-login-enabled.png`, `04-login-disabled.png`, `04-system-login-disabled.png`, matching AX |
| 5 | **Pass** | Clicked About > Debug > Copy report. UI confirmed Copied; pbpaste held 4,061 characters with version, macOS/Darwin, provider, counts and logs. Case-insensitive sk-, token and Bearer matches were all zero. | B: `05-copy-report-clicked.png`, `05-clipboard-check.json`, `05-copied-report.txt` |
| 6 | **Pass** | Clicked Back up to Desktop. New backup folder appeared, Finder selected that exact folder, and its actual heel.db returned integrity_check=ok. | B: `06-backup-clicked.png`, `06-finder-revealed.png`, `06-backup-verified.json` |
| 7 | **Pass — corrected setup semantics** | One grouped AI list: Claude/Codex subscriptions available; Ollama visibly disabled with not-running instructions; Claude API/OpenAI/Mistral show Add API key setup entries. Claude stays active; three Keychain items absent. Top and bottom of native list inspected visually. | B: `07-ai-list-open.png`, `07-ai-list-bottom.png`, `backend-brain.json`, `final-data-comparison.json` |
| 8 | **Pass — fixed** | From Claude with API disclosure closed, choosing Mistral setup automatically opens three empty secure fields and accurate notice without changing active AI. Closing it manually and choosing setup again reopens it. Reobserved setup in the remaining-six run too. | A: `08-mistral-setup-open.ax.txt`, `.desktop.png`, `08-reopened-after-manual-close.*`, `08-setup-backend-verification.json`; B: `09-setup-toast.png` |
| 9 | **Pass** | Triggered Mistral setup notice, reopened the native AI list while notice active, pressed Esc once. List closed, Settings stayed open, same notice remained. No provider change or API request. | B: `09-setup-toast.png`, `09-menu-with-toast.png`, `09-escape-result.png`, `09-verdict.json` |
| 10 | **Pass** | With Settings open and no active selector/notice, two sequential native Escape calls completed in 93 ms (38 + 55). Settings closed; main panel stayed open, showing Now and Forward to Settings. Exactly one layer closed. | B: `10-settings-before.png`, `10-double-escape-result.png`, `10-verdict.json` |

For check 9, the modal menu's AX tree omits background content and its screenshot partly covers the top notice card. The notice is positively recorded immediately before and after the menu/Esc sequence; no claim that its full text is exposed while the modal list is open. For check 10, the main view does not contain a Today heading in this build; Now plus Forward to Settings are the actual positive main-view evidence. An initial helper match duplicated the focused-element summary and aborted before an action; this was a test-helper targeting guard, not an app failure.

## Mistral root cause and source patch

The selector previously disabled missing-key APIs while the backend correctly rejected activating unavailable providers. Missing-key API entries now explicitly open setup and explain that the selected AI stays unchanged. Backend readiness validation remains intact. Unavailable CLI/local entries remain disabled.

Four tracked files remain uncommitted:
- `src/settings/brain-model.ts`: explicit selectable missing-key setup entries.
- `src/settings/BrainSelect.tsx`: routes setup choices to disclosure and accurate notice; ready choices keep the normal save path.
- `src/settings/BrainSettings.tsx`: owns disclosure state and supports reopening after manual close.
- `src/settings/brain-model.test.ts`: keyed-provider setup regressions plus unavailable Ollama.

No source edits were needed for this six-check rerun. Saved source patch is A: `source.patch`. Do not re-disable the API setup actions or weaken `/brain` readiness validation.

## Automated and backend verification

On this exact candidate before native verification:
- `npm test`: **743 passed across 142 files**.
- Targeted model/API-guard/Escape tests: **33 passed**.
- `npm run typecheck`, `git diff --check`, `npm run tauri -- build --bundles app`: passed.
- Build is ad-hoc signed; notarization intentionally not attempted. Existing Vite chunk-size warning is not a build failure.

No code changed since those automated checks, so they were not rerun redundantly during this UI-only pass.

Independent authenticated GETs rerun in B:
- `/debug`: HTTP 200, zero case-insensitive sk-|bearer|"token" matches.
- `/data/preview`: HTTP 200, zero matches, counts-only metadata inspected.
- `/brain`: HTTP 200, zero matches, active provider Claude.
- Auth token read privately in process; never echoed or written to evidence.

## Backup, data preservation and final state

Fresh private pre-six-check backup: `/Users/jasonpoindexter/Library/Application Support/studio.theft.heel-check-backups/six-checks-20261030T144022Z`. Explicit file-copy SHA256s matched and a separate online SQLite backup returned integrity_check=ok before the first UI action.

B: `final-data-comparison.json` confirms every table unchanged, including the brain setting and timestamp. All nine copied live files match baseline bytes, including main DB, WAL/SHM, panel place/size, mascot-hidden, shell-settings, sidecar log and session JSON. Same final binary hash and single PID. No task, message, document, focus or skill mutation.

Final state: login item off and absent, Dock on, Always on top off, Claude selected, API keys closed, Settings groups collapsed, panel hidden. All three provider Keychain items remain absent (security exit 44). No real API call or Test connection. No Email interaction, wipe, mail send, credentials, Trello writes or commit.

UI-created backup retained at `/Users/jasonpoindexter/Desktop/heel-backup-2026-10-30-14-41-54/`, containing `data.json` and `heel.db`; DB SHA256 `8e8781f1de36b435cda844109553112d46b360cb6401f4f100b6c535c9daff09`. Only a backup was added; no existing file deleted.

The prior TextEdit fixture was already safely saved/closed after the first four checks; no new TextEdit interaction in this rerun. Old small panel offset predates both new batches; current preferences match their fresh baselines.

## Claude: next exact task and constraints

1. Review the four uncommitted frontend changes and evidence for this exact hash. All ten scoped native scenarios are now verified; do not repeat the stale six-check gap.
2. Preserve the missing-key setup behavior and parked-versus-floating specification. Preserve all user work/data. Review only relevant source/doc files; no blanket git add.
3. Report any concrete regression against these observations. If source/binary changes, rerun affected paths before carrying acceptance forward.
4. Keep broader gates separate: real API-key connection, actual logout/login behavior, idle CPU measurement, full accessibility conformance, notarization and whole-card acceptance were not established by these ten scenarios.

Correct card mapping if Jason later asks for Trello: N30 Debug, B9 Window Levels, N10 Startup/Dock, N9 idle CPU. No broader card closure inferred. The original referenced model-routing file is absent at `docs/04-technical/model-and-effort-routing.md`; no model override or Claude invocation was made.

Evidence includes private desktop/UI metadata. **Do not blanket-publish `handoffs/`, `assets/`, screenshots, copied reports or data backups.** No secrets are in the handoff; keep private backups local.

Return a focused acceptance/review summary with exact candidate and any specific regression. No mascot regeneration, platform rebuild, dependencies or unrelated changes are part of this handoff.

Skills applied: use, claude-codex-handoff, dec-accessibility, dec-quality-testing.
