# Handoff: Heel step-1 checks in the real app (Claude → Codex, 2026-10-30)

You have what Claude's shell does not: Accessibility and Screen Recording. Run the ten
one-click checks on the shipped build, report pass/fail per line, hand back a results file.

## State when you start

- Repo: `~/Documents/GitHub/Greg agent`, branch `main`, head `67ab021` (ROADMAP) on top of `01e89c2` (the fix under test). Tree clean apart from untracked `assets/` and `handoffs/`.
- Build under test: `src-tauri/target/release/bundle/macos/Heel.app`, built 01:25 today from `01e89c2`, 41.78 MiB, ad-hoc signed, not notarized.
- Heel is probably already running (launched 13:03). Check: `pgrep -lf "Heel.app/Contents/MacOS/heel"`. If not running: `open src-tauri/target/release/bundle/macos/Heel.app`. **Never two instances.**
- Data dir: `~/Library/Application Support/studio.theft.heel/` (heel.db, panel-place.json, panel-size-v2.json, mascot-hidden.json, sidecar.log, sidecar.json). A copy with SHA-256s is at
  `/private/tmp/claude-501/-Users-jasonpoindexter-Documents-GitHub-Greg-agent/bfd78547-0526-4748-acc8-55018a0aba9e/scratchpad/data-backup-0123/` (may be gone if the Mac rebooted; take your own before you start: copy by file name, hash with `shasum -a 256`).
- Sidecar: port and token in `sidecar.json`; header `x-heel-token: <token>`; base `http://127.0.0.1:<port>`.
- Windows (Tauri labels / titles): `main` "Heel" (Greg, transparent, always on top), `panel` "Heel panel", `notice` "Heel notice".

## Hard rules

- Restore never deletes: copy by explicit file names, then verify hashes. No `rm -rf`, no `pkill -f`; stop processes by PID or by port (`lsof -t -iTCP:PORT -sTCP:LISTEN`).
- No real API keys, Apple credentials, or tokens anywhere. Keychain items `provider-key:anthropic|openai|mistral` under service `studio.theft.heel` must stay empty unless Jason pastes a key himself. Check with `security find-generic-password -a provider-key:mistral -s studio.theft.heel` (expect "could not be found").
- Login item: turn it on only to verify line 4, then turn it **off** and confirm it is gone.
- Nothing is sent from Mail/Gmail. Do not touch Settings › Email.
- Do not wipe (Privacy & data › Wipe). Back up is fine.
- Commit nothing. Results go in the handback file below.

## Driving the app

Screenshot with `screencapture -x <file>`; find the panel by window title "Heel panel" (`osascript -e 'tell application "System Events" to get position of window "Heel panel" of process "heel"'`); click with `cliclick` or `osascript`. Take a screenshot after every action; the observation is the evidence.

Panel map (from today's screenshot, 820 × 1240 px window): header icons top right in order search · gear · chevron · pin · close. Gear opens Settings. Settings groups in order: Look · Greg · Ways of working · Brain · Email · Startup · Privacy & data · About.

## The ten checks

Report each as **Pass / Fail / Not verified** with the screenshot file name.

| # | Where | Action | Expected |
|---|---|---|---|
| 1 | Desktop | Click Greg once, then click another app's window | Greg and the panel stay above the other app (N30 window level) |
| 2 | Desktop | Click the transparent area next to Greg, over another app | That app receives the click; Heel does not come forward (N9 click-through) |
| 3 | Settings › Startup | Toggle "Show Heel in the Dock" off, then on | Dock icon disappears and reappears without a relaunch (N4) |
| 4 | Settings › Startup | Toggle "Open Heel when you log in" on | System Settings › General › Login Items lists Heel. Then toggle off; it is gone (N10) |
| 5 | Settings › About | "Copy report" | Clipboard (`pbpaste`) holds version, OS, provider, counts, log tail. Grep it for `sk-`, `token`, `Bearer`: zero hits (B9) |
| 6 | Settings › Privacy & data | "Back up to Desktop…" | A `heel-backup-*.db` (or similar) appears on the Desktop; Finder reveals it; `sqlite3 <file> "pragma integrity_check"` says ok (B9) |
| 7 | Settings › Brain | Look at the "AI" select | One grouped list. Claude and Codex ready. Anthropic, OpenAI, Mistral greyed "No API key yet…". Ollama greyed "isn't running" |
| 8 | Settings › Brain | With Claude chosen, "API keys" disclosure is closed. Pick Mistral | Disclosure opens showing three key fields; the choice toast appears. Pick Claude again afterwards |
| 9 | Settings › Brain | Open the AI list, wait for a toast to be visible, press Esc | The list closes; Settings stays open (last night's fix) |
| 10 | Any layer | Open Settings, press Esc twice fast during the fade | Exactly one layer closes, not two (L1) |

Backend side of 5 and 6, independent of the buttons (do these too):

```bash
D="$HOME/Library/Application Support/studio.theft.heel"
PORT=$(node -e 'console.log(require(process.argv[1]).port)' "$D/sidecar.json")
TOKEN=$(node -e 'console.log(require(process.argv[1]).token)' "$D/sidecar.json")
curl -s -H "x-heel-token: $TOKEN" "http://127.0.0.1:$PORT/debug" | grep -c -i -E 'sk-|bearer|"token"'   # expect 0
curl -s -H "x-heel-token: $TOKEN" "http://127.0.0.1:$PORT/data/preview"                              # counts only
```

## After the ten

Verify the data dir: `heel.db` may have grown (WAL checkpoint) only if you changed settings; `panel-*.json` and `mascot-hidden.json` should match your hashes unless you moved or resized the panel. State any difference and why.

Steps 2 and 3 from Jason's list are **not yours** unless he hands you the secret in chat: a real API key for Test connection, and `APPLE_ID` + app-specific password for notarization (`set -a; source .env; set +a; npm run release`). Do not fake either.

## Hand back

Write `handoffs/codex-to-claude-step1-results-2026-10-30.md`: the table with your verdicts and screenshot paths, the backend grep counts, the data-dir hash comparison, and anything that looked wrong even if it passed. Trello (board https://trello.com/b/pbqxn0aI): one comment per card you closed, format "Done / Not done / Not verified", **at most two Trello writes per card**. Cards: N30, N9, N4, N10, B9, L1 (search the Done list by prefix). Leave failures for Claude to fix; do not patch code.
