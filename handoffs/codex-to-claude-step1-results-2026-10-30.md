> Superseded: all ten scoped checks have now been verified on the same rebuilt candidate. Read `codex-to-claude-step1-followup-2026-10-30.md`. Original results below are historical.

# Handoff: Heel step-1 results — Codex → Claude

Date: 2026-10-30T13:36:49+01:00
Project: `/Users/jasonpoindexter/Documents/GitHub/Greg agent`
Input: `handoffs/claude-to-codex-step1-checks-2026-10-30.md`

## Result and remaining gate

**6 Pass / 0 Fail / 4 Not verified. Do not close step1 as fully verified.** Window z-order, transparent click-through and the actual Dock icon still need a desktop-wide observer. Check8's requested Mistral selection conflicts with check7's disabled-no-key design. The saved panel position shifted4px left and38px up during testing; the attempted title-bar drag did not restore it. Original preference bytes and an online SQLite backup remain available. No real task/message/document changes were found.

## Exact build and evidence

- Branch/head at start: main /67ab021, fix under test01e89c2 according to Claude's handoff. No independent embedded commit attestation was available; no rebuild performed.
- App: `/Users/jasonpoindexter/Documents/GitHub/Greg agent/src-tauri/target/release/bundle/macos/Heel.app`
- Binary SHA256: `230eca25ced9a5572e0d47edb387ba2e53def64ea4e93e7d23e69b090c283104`
- Binary size: 41,715,024 bytes; mtime UTC `2026-10-30T00:25:59.946786+00:00`; version `0.1.0`.
- Single running PID65375 before and after. No second instance, relaunch, process termination or helper restart.
- Evidence directory: `/Users/jasonpoindexter/Documents/GitHub/Greg agent/handoffs/step1-evidence-2026-10-30-20261030T121413Z`. Native app controls were driven through CUA; screenshots and AX snapshots saved after semantic actions. Images capture individual windows, not the full composed desktop.
- Private pre-test backup: `/Users/jasonpoindexter/Library/Application Support/studio.theft.heel-check-backups/20261030T121413Z`. Eight explicit files copied; all source/copy hashes matched and were stable during copy. Separate `heel-consistent.db` online backup integrity check: **ok**. Sidecar authentication JSON is in the private backup only; no credential value printed or included in this report.

## Ten real-app checks

| # | Verdict | Check | Observed / limitation | Screenshot evidence |
| --- | --- | --- | --- | --- |
| 1 | **Not verified** | Greg/panel above another app | Clicked Greg, then the known Finder backup row. The panel remained open in AX. Per-window images cannot establish composited z-order. Baseline is parked/undocked with alwaysOnTop=false, so the expected pinned-panel behaviour is also an unmet precondition. | [01-greg-click-panel-open.png](step1-evidence-2026-10-30-20261030T121413Z/01-greg-click-panel-open.png)<br>[01-heel-after-other-app-click.png](step1-evidence-2026-10-30-20261030T121413Z/01-heel-after-other-app-click.png) |
| 2 | **Not verified** | Transparent-area click-through | Captured the real transparent mascot window. Did not click through an unidentified underlying screen target: the available window-local UI view did not establish a safe known underlay/global click position. No click-through pass inferred from source or unit tests. | [02-transparent-window-reference.png](step1-evidence-2026-10-30-20261030T121413Z/02-transparent-window-reference.png) |
| 3 | **Not verified** | Dock icon off/on without relaunch | Executed off then on; switch states changed, no error shown, same single Heel PID65375 throughout. Dock accessibility inspection timed out (-10005), so actual icon disappearance/reappearance was not visually established. Final preference is on, matching baseline. | [03-dock-off.png](step1-evidence-2026-10-30-20261030T121413Z/03-dock-off.png)<br>[03-dock-restored-on.png](step1-evidence-2026-10-30-20261030T121413Z/03-dock-restored-on.png) |
| 4 | **Pass** | Login item on, system-listed, then off and absent | Enabled in Heel. System Settings > Login Items & Extensions listed Heel.app. Disabled in Heel; reopened the actual Login Items pane and confirmed Heel.app absent. Final app switch off. | [04-login-enabled.png](step1-evidence-2026-10-30-20261030T121413Z/04-login-enabled.png)<br>[04-system-login-enabled.png](step1-evidence-2026-10-30-20261030T121413Z/04-system-login-enabled.png)<br>[04-login-disabled.png](step1-evidence-2026-10-30-20261030T121413Z/04-login-disabled.png)<br>[04-system-login-disabled-confirmed.png](step1-evidence-2026-10-30-20261030T121413Z/04-system-login-disabled-confirmed.png) |
| 5 | **Pass** | Copy report via UI and inspect clipboard | Clicked About > Debug > Copy report. UI said Copied. Clipboard3447 characters includes version0.1.0, macOS/Darwin, Claude, counts and logs. Case-insensitive sk-, token, Bearer counts all0. | [05-copy-report-clicked.png](step1-evidence-2026-10-30-20261030T121413Z/05-copy-report-clicked.png) |
| 6 | **Pass** | Back up via UI, Finder reveal, SQLite integrity | Clicked Privacy & data > Back up to Desktop. Created Desktop/heel-backup-2026-10-30-12-17-06 containing data.json and heel.db; Finder selected the folder. The actual backup database returned integrity_check=ok. | [06-backup-clicked.png](step1-evidence-2026-10-30-20261030T121413Z/06-backup-clicked.png)<br>[06-finder-revealed.png](step1-evidence-2026-10-30-20261030T121413Z/06-finder-revealed.png) |
| 7 | **Pass** | One grouped AI list, ready and disabled entries | Observed Claude and Codex subscription groups ready; Ollama greyed with not-running instruction; Claude API/OpenAI/Mistral greyed with No API key yet instruction. Before/after Keychain checks confirm all3 API-key items absent. | [07-ai-list-open.png](step1-evidence-2026-10-30-20261030T121413Z/07-ai-list-open.png)<br>[07-ai-list-bottom.png](step1-evidence-2026-10-30-20261030T121413Z/07-ai-list-bottom.png) |
| 8 | **Not verified** | Unready Mistral selection automatically opens key disclosure | With Claude selected the disclosure is closed. Clicking disabled Mistral leaves the list/selection unchanged, as check7 requires. Consequently this test cannot reach automatic opening or a Mistral choice toast without changing its preconditions. Manually opening shows3 empty secure key fields and disabled Save buttons; closed again. Claude restored. No key entered or Test connection pressed. | [08-mistral-disabled-attempt.png](step1-evidence-2026-10-30-20261030T121413Z/08-mistral-disabled-attempt.png)<br>[08-ai-list-closed.png](step1-evidence-2026-10-30-20261030T121413Z/08-ai-list-closed.png)<br>[08-key-fields-manually-opened.png](step1-evidence-2026-10-30-20261030T121413Z/08-key-fields-manually-opened.png)<br>[09-final-claude-restored.png](step1-evidence-2026-10-30-20261030T121413Z/09-final-claude-restored.png) |
| 9 | **Pass** | Esc closes AI list under an active toast, Settings stays | Changed Claude→Codex, captured its choice toast, reopened the AI list while toast visible, pressed Esc once. List closed, Settings and Codex combo remained, toast still present. Restored Claude afterwards. | [09-valid-codex-toast.png](step1-evidence-2026-10-30-20261030T121413Z/09-valid-codex-toast.png)<br>[09-valid-menu-with-toast.png](step1-evidence-2026-10-30-20261030T121413Z/09-valid-menu-with-toast.png)<br>[09-valid-escape-result.png](step1-evidence-2026-10-30-20261030T121413Z/09-valid-escape-result.png)<br>[09-final-claude-restored.png](step1-evidence-2026-10-30-20261030T121413Z/09-final-claude-restored.png) |
| 10 | **Pass** | Two rapid Esc presses close one layer | Started with Settings open and no active selector. Two native Escape calls completed in46ms (9ms +37ms). Result: Today remained open, Settings absent, Forward to Settings visible. Panel did not close. | [10-settings-before-double-escape.png](step1-evidence-2026-10-30-20261030T121413Z/10-settings-before-double-escape.png)<br>[10-double-escape-result.png](step1-evidence-2026-10-30-20261030T121413Z/10-double-escape-result.png) |

These Pass verdicts apply to the exact observed behaviours above. They do not certify the entire Trello card, all settings, every Escape context, native window layering or full accessibility conformance.

## Backend checks (executed independently of buttons)

- Authenticated localhost GET `/debug`: HTTP200; case-insensitive `sk-|bearer|"token"` matches **0**. Authentication read in process from sidecar.json and never echoed.
- GET `/data/preview`: HTTP200, matches **0**, counts tasks2 /parked0 /messages8 /documents0 /skills0. Response includes data-folder/file-size/retention metadata, not task/message contents.
- Copy-report clipboard: all required sections present; `sk-`0 / `token`0 / `Bearer`0. Details in `step1-evidence-2026-10-30-20261030T121413Z/05-clipboard-check.json`; local copied report saved only after the pattern check returned0.
- Provider Keychain items under service studio.theft.heel: anthropic/openai/mistral all absent before and after (security exit44). No key retrieval, key entry, key save, provider test, credential creation or notarization command.
- Desktop backup: `/Users/jasonpoindexter/Desktop/heel-backup-2026-10-30-12-17-06/heel.db`; integrity_check **ok**; SHA256 `3fb71ac890058998c9d4d2cf41d55876b9f3e534632ed72c092ecc58b93787ab`. Finder reveal observed and captured, not inferred from file creation.

## Data-dir comparison and cleanup

| File | Result |
| --- | --- |
| `heel.db` | Unchanged |
| `heel.db-wal` | Changed during test; settings writes / SQLite shared-memory activity |
| `heel.db-shm` | Changed during test; settings writes / SQLite shared-memory activity |
| `panel-place.json` | Changed during test; (1798,214) → (1794,176), still undocked; exact source of shift not established |
| `panel-size-v2.json` | Unchanged |
| `mascot-hidden.json` | Unchanged |
| `sidecar.log` | Unchanged |
| `sidecar.json` | Unchanged |

Full before/after SHA256s and table content hashes: `step1-evidence-2026-10-30-20261030T121413Z/baseline.json` and `step1-evidence-2026-10-30-20261030T121413Z/after-comparison.json`. All actual data-table contents matched the online pre-test backup. Only `settings` differed: the `brain` row's `updated_at` changed; its value is identical to baseline (Claude restored). WAL/SHM changes are consistent with those settings writes and database reads. `heel.db` main-file bytes remained unchanged; the table comparison, rather than main-file hash alone, establishes unchanged real records.

`panel-size-v2.json` and `mascot-hidden.json` match baseline. `panel-place.json` remains at x1794/y176 rather than original x1798/y214, docked=false in both. No intentional drag/resize was performed during the checks; the small shift was detected afterwards. A single subsequent native title-bar drag attempted cleanup but produced no saved-position change (`step1-evidence-2026-10-30-20261030T121413Z/panel-position-restoration.json`). No blind preference overwrite or database restore was performed; preserve current live state. Original file is in the private backup for a controlled restore or manual position correction.

Dock preference is back on; login item is off and absent from the actual macOS list; provider Claude selected; API disclosure closed. Panel is left in Settings with all groups collapsed, matching its initial UI view. `shell-settings.json` now reads alwaysOnTop=false, dockIcon=true, hotkey=super+shift+h; that file was not in the explicit baseline copy list, so no claim of original byte equality. Initial visible Dock and shortcut settings match final values.

## Handoff inconsistencies and navigation notes

- Real Trello mapping differs from the supplied table: **N30 is Debug/Copy report; B9 is Window Levels**. N4 is the broader robust-settings card; N10 includes startup and Dock; N9 is idle CPU and includes a click-through acceptance subcriterion. Do not attach Copy-report proof to B9 or claim N9's CPU target tested.
- B9 explicitly says the panel floats while pinned to Greg or when Always on top is enabled. The initial panel is parked/undocked and alwaysOnTop=false. Revise check1's preconditions; do not force the user's setting on just to obtain a pass.
- Check8 cannot select the disabled Mistral item under the zero-key prerequisite. Decide whether disabled entries should expose setup via another action or test automatic opening using a separate approved fixture. Do not use a real key or mutate the live DB to manufacture this state.
- Some early navigation captures labelled `09-repeat-*` are **not** valid toast-regression proof: an accessibility-index reset opened the read-only Writer skill view. It was closed without typing/saving. Use only `09-valid-*` for the passing toast case. This automation targeting error is not recorded as a product failure.
- System Settings navigated to General after the first off check. The preliminary `04-system-login-disabled.*` does not prove removal; the subsequently reopened `04-system-login-disabled-confirmed.*` does.

## Trello (read only)

Board lookup completed with hasNextPage=false. All six requested cards already reside in Done. No card was closed, moved or commented on in this run, so there were **0 Trello writes**. Existing statuses were not used as evidence of runtime behaviour.

| Live card | List | Action |
| --- | --- | --- |
| [B9 WINDOW LEVELS: the panel is not always on top — only while pinned to Greg or with an "Always on top" option; Greg himself always is](https://trello.com/c/04crz8wf/121-b9-window-levels-the-panel-is-not-always-on-top-only-while-pinned-to-greg-or-with-an-always-on-top-option-greg-himself-always-is) | Done | Read only; no status or comments changed |
| [N30 DEBUG: a log Heel keeps itself, a Debug section in Settings, and one Copy report button — so "something broke" can be tracked](https://trello.com/c/a90wSwPS/120-n30-debug-a-log-heel-keeps-itself-a-debug-section-in-settings-and-one-copy-report-button-so-something-broke-can-be-tracked) | Done | Read only; no status or comments changed |
| [N4 ROBUST SETTINGS (absorbs V1-8): every setting a daily user needs, in one compact place](https://trello.com/c/Bdi1Ik1x/86-n4-robust-settings-absorbs-v1-8-every-setting-a-daily-user-needs-in-one-compact-place) | Done | Read only; no status or comments changed |
| [N9 IDLE COST: drop idle CPU from 2-3% to near 0 (audit #8, severity 2)](https://trello.com/c/la6Q0jmR/91-n9-idle-cost-drop-idle-cpu-from-2-3-to-near-0-audit-8-severity-2) | Done | Read only; no status or comments changed |
| [N10 STARTUP + HARDENING: launch at login, optional Dock icon, Content Security Policy (audit #9, #11)](https://trello.com/c/c9p5qB3X/92-n10-startup-hardening-launch-at-login-optional-dock-icon-content-security-policy-audit-9-11) | Done | Read only; no status or comments changed |
| [L1 LEFTOVERS from P1–P3: wipe is one transaction, Esc mid-fade no longer closes two layers, "Bucket" reads "Section"](https://trello.com/c/4i3iRzi9/136-l1-leftovers-from-p1-p3-wipe-is-one-transaction-esc-mid-fade-no-longer-closes-two-layers-bucket-reads-section) | Done | Read only; no status or comments changed |

Suggested narrowly scoped hand-back comments, if Jason asks for posting: N30 “Done: Copy report UI/clipboard verified;0 secret-pattern matches”; N10 “Done: login on/listed/off/removed; Not verified: actual Dock icon, though preference toggles and PID unchanged”; L1 “Done: two Esc calls in46ms close Settings only; other card scopes not tested”; B9/N9 “Not verified: window stacking/click-through/CPU, see results”; N4 “Done: backup/report specific checks; Not verified: automatic missing-key provider selection.” No whole-card acceptance inferred.

## Next exact task for Claude

1. Read this report and evidence. Correct the card/test mapping and check8 contradiction.
2. Obtain desktop-wide runtime proof for stacking (with explicit pinned/always-on-top preconditions), click-through over a safe known target, and the actual Dock icon. Current per-window captures do not answer those questions. Leave these three checks open.
3. Inspect why the parked panel shifted and why the attempted native title-bar correction did not persist; fix only if reproduced. Preserve the verified backup and real data.
4. Return specific failing lines / corrected scenarios; do not represent six passes as all ten complete.

## Scope preserved

No application source patch, git commit, build, data wipe, mail/Gmail send, Email-settings interaction, real API connection test or Apple notarization. Native login toggle was reverted. No private task/message text was exported to external services. Tracked git diff remains empty.
