# Handoff: Claude → Codex — notarize Heel, publish v0.1.2, two native checks

Date: 2026-11-05 · Repo: `/Users/jasonpoindexter/Documents/GitHub/Greg agent` (jpoindexter/heel, **public**), branch `main` at `93dcef8`.
Read `AGENTS.md`, `docs/RELEASE.md`, `docs/TESTERS.md` first.

## Where things are
- v0.1.1 is a GitHub **prerelease**, Developer ID–signed, **not notarized**: https://github.com/jpoindexter/heel/releases/tag/v0.1.1 (asset sha256 `a8a306a4…da58`). Gatekeeper says "Unnotarized Developer ID".
- Signing works: `npm run release:signed` → `scripts/release-signed.sh`. Identity by SHA-1 (two Developer ID certs share one name): `F146F8A6C9E1BC060AE312AA6F4C6D75522C8D75`, team `5352PXMNV5`. Entitlements: `src-tauri/Entitlements.plist` (Apple Events).
- Notarization is blocked on one step only Jason does: storing a notarytool profile named `heel` with a fresh app-specific password. The old `vanta` profile answers HTTP 401.
- Heel.app is not running. Data dir: `~/Library/Application Support/studio.theft.heel`.

## Step 0 — gate (do not skip)
```bash
xcrun notarytool history --keychain-profile heel
```
- Prints a table (even an empty one) → go on.
- "No Keychain password item found" or 401 → **stop**. Tell Jason to run this himself in Terminal and paste the password only there:
  `xcrun notarytool store-credentials heel --apple-id jason.poindexter@gmail.com --team-id 5352PXMNV5`
  Never type, ask for, or store the password yourself.

## Step 1 — version 0.1.2
Tag v0.1.1 exists, so the notarized build is 0.1.2. Change `0.1.1` → `0.1.2` in: `package.json`, the two root `"name": "heel"` entries in `package-lock.json`, `shared/version.ts`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`; then `(cd src-tauri && cargo update -p heel --offline)`. Run `node node_modules/vitest/vitest.mjs run` (expect 758 passed, `shared/version.test.ts` checks the versions agree) and `npm run typecheck`. Commit only those files: `chore(release): 0.1.2`.

## Step 2 — build, notarize, staple
```bash
APPLE_SIGNING_IDENTITY=F146F8A6C9E1BC060AE312AA6F4C6D75522C8D75 HEEL_NOTARY_PROFILE=heel npm run release:signed
```
The script ends with `spctl` on the DMG and the app. Pass = both say `accepted` and `source=Notarized Developer ID`. Also:
```bash
xcrun stapler validate src-tauri/target/release/bundle/dmg/Heel_0.1.2_aarch64.dmg
xcrun stapler validate src-tauri/target/release/bundle/macos/Heel.app
```
If notarization is rejected: `xcrun notarytool log <submission-id> --keychain-profile heel` and fix what it names (usually an unsigned nested binary or a missing entitlement). Log the failure in `ERRORS.md` if it takes more than two tries.

## Step 3 — publish v0.1.2
Push `main`. Release notes: copy v0.1.1's (`gh release view v0.1.1 --json body`), replace the "Opening it" section with "Signed and notarized by Apple: opens like any app.", update the SHA-256 line. Then:
```bash
gh release create v0.1.2 src-tauri/target/release/bundle/dmg/Heel_0.1.2_aarch64.dmg --repo jpoindexter/heel --target "$(git rev-parse HEAD)" --title "Heel 0.1.2 — tester build (notarized)" --notes-file <notes> --prerelease
gh release view v0.1.2 --repo jpoindexter/heel --json assets --jq '.assets[].digest'
```
`--target` must be a full SHA (a short one is refused). Pass = the digest equals `shasum -a 256` of the local DMG. Leave v0.1.0 and v0.1.1 alone. In `docs/TESTERS.md` step 2, drop the Open Anyway sentence; in `docs/RELEASE.md` › Status, say notarization ran. Commit `docs: v0.1.2 notarized`.

## Step 4 — two native checks on the 0.1.2 app
Before launching: back up the six data files by name (`heel.db mascot-hidden.json panel-place.json panel-size-v2.json shell-settings.json sidecar.log`) with hashes, and per-table `count(*)` + `.dump | shasum` from a **copy** of `heel.db` (read-only open fails on WAL without `-shm`). One Heel instance only.
1. **Help.** Settings › Help (first group) opens; nine topics; each folds open to numbered steps; text wraps inside the panel, no clipping; keyboard: Tab reaches each topic, Space/Enter opens it, focus ring visible. Screenshot light and dark.
2. **Send feedback.** Settings › About › Send feedback: choose *Something broke*, title `Codex check — ignore`, a sentence in What happened, debug report on, press **Write the email…**. Pass = a draft in the default mail app with To `jason@theft.studio`, subject `[Heel 0.1.2 bug] Codex check — ignore`, body sections WHAT HAPPENED, `----`, `DEBUG REPORT…`, and no task/message/mail text in it. **Never press Send.** Close the draft and choose Delete Draft. Heel's status line should read "An email to jason@theft.studio is open in your mail app…".

After: stop Heel (`kill -TERM` the `heel` pid; the helper exits with it), compare the table lists with the backup copy. A changed table is a finding to report, not a reason to restore. **A restore never deletes**; copy by explicit names, then verify.

## Hard rules
- No passwords, app-specific passwords or API keys typed anywhere. No real Test connection.
- No `rm -rf`, no `pkill -f`; stop helpers by pid or port.
- Never press Send in Mail. Never force-push. Don't touch `assets/`, `handoffs/` evidence or `graphify-out/` in git (all untracked or ignored).
- Commit only the files named above; messages end with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` per repo convention.

## Hand back
Write `handoffs/codex-to-claude-notarize-release-2026-11-05.md`: step 0 result, the notary submission id and status, both `spctl` lines, the v0.1.2 URL and digest, the two native checks as Pass / Fail / Not verified with screenshot paths, and the data comparison. Trello (≤ 2 writes per card): one comment on **V1-10** (notarized or why not) and one on **T1 TESTER RELEASE** (the native checks). Don't move cards.
