# Release: a signed, notarized Heel.app (V1-10)

Today's builds are ad-hoc signed (`"signingIdentity": "-"` in `src-tauri/tauri.conf.json`): fine on this Mac, "unidentified developer" on any other. A build other people can open needs a Developer ID certificate and notarization. Everything below is one-time setup by Jason, then one command per release.

## One-time (Jason)
1. An Apple Developer Program membership (paid; a free account cannot notarize).
2. In Xcode › Settings › Accounts (or developer.apple.com › Certificates), create a **Developer ID Application** certificate and install it in the login keychain. Check: `security find-identity -v -p codesigning` lists `Developer ID Application: … (TEAMID)`.
3. An app-specific password for the Apple ID at appleid.apple.com › Sign-In and Security › App-Specific Passwords (or an App Store Connect API key: issuer id, key id, the .p8 file).
4. Copy `.env.example` to `.env`, fill in `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` (or the API trio). `.env` is gitignored; never paste these in chat or a card.
5. In `src-tauri/tauri.conf.json`, change `"signingIdentity": "-"` to the identity string from step 2, or remove the line so `APPLE_SIGNING_IDENTITY` is used. Leaving `"-"` keeps ad-hoc builds for local checks.

## Each release
```bash
set -a; source .env; set +a; npm run release
```
`npm run release` runs `tauri build --bundles app,dmg`: Vite build, the helper bundled into `src-tauri/resources/sidecar/`, the Rust shell, then signing with the hardened runtime and, with the Apple variables set, notarization and stapling. Output: `src-tauri/target/release/bundle/macos/Heel.app` and `…/dmg/Heel_<version>_aarch64.dmg`.

Check the result before sharing it:
```bash
spctl -a -vv src-tauri/target/release/bundle/macos/Heel.app
xcrun stapler validate src-tauri/target/release/bundle/macos/Heel.app
```
Both must say accepted / "The validate action worked".

## What the shell already does for a shipped app
The helper is bundled and starts and stops with the app (`src-tauri/src/sidecar_process.rs`); a crash restarts it with a new token and the panel retries once on 401; `heel.db` and its WAL files are mode 0600; the connection file is 0600 and removed on quit; provider status is kept 30 s so Settings does not spawn the CLIs on every open. Automation prompts (Mail, Calendar, Reminders, Notes) need `NSAppleEventsUsageDescription`, already in `src-tauri/Info.plist`.

## The keychain-profile route (what Jason's Mac has)
Two Developer ID Application certificates for team 5352PXMNV5 share one name, so name the identity by its SHA-1. Notarization uses a `notarytool` profile instead of variables:
```bash
xcrun notarytool store-credentials heel --apple-id <apple id> --team-id 5352PXMNV5   # asks for a fresh app-specific password
APPLE_SIGNING_IDENTITY=<sha-1> HEEL_NOTARY_PROFILE=heel npm run release:signed
```
`scripts/release-signed.sh` builds with the Developer ID through a config override (local `npm run release` stays ad-hoc), signs the DMG, checks both signatures, then notarizes the DMG, staples the DMG and the app, and asks Gatekeeper. Without `HEEL_NOTARY_PROFILE` it stops after signing. `src-tauri/Entitlements.plist` grants Apple Events under the hardened runtime (Mail, Calendar, Reminders, Notes).

## Status (2026-11-05)
Developer ID signing ran on Jason's Mac. Notarization did not: the existing `vanta` notary profile answers HTTP 401 (its app-specific password is no longer valid). A signed, un-notarized build opens on another Mac only after System Settings › Privacy & Security › Open Anyway.
