# Release: a signed, notarized Heel.app (V1-10)

Local builds are ad-hoc signed (`"signingIdentity": "-"` in `src-tauri/tauri.conf.json`): fine on this Mac, "unidentified developer" on any other. A build other people can open needs a Developer ID certificate and notarization. Everything below is one-time setup by Jason, then one command per release.

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

Starting with 0.1.4, `bundle:sidecar` also compiles the PDFKit/Vision CV reader on the developer's Mac. Tauri packages it as `Contents/MacOS/heel-cv-text` through `externalBin`, so it is signed with the app. Testers never run a compiler or install OCR packages. `npm test` builds the development reader before executing its integration tests. When checking a release, verify the reader's signature and run it from the packaged app with an invalid `DEVELOPER_DIR` against the synthetic text and scanned PDF fixtures.

## What the shell already does for a shipped app
The helper is bundled and starts and stops with the app (`src-tauri/src/sidecar_process.rs`); a crash restarts it with a new token and the panel retries once on 401; `heel.db` and its WAL files are mode 0600; the connection file is 0600 and removed on quit; provider status is kept 30 s so Settings does not spawn the CLIs on every open. Automation prompts (Mail, Calendar, Reminders, Notes) need `NSAppleEventsUsageDescription`, already in `src-tauri/Info.plist`.

## The keychain-profile route (what Jason's Mac has)
Two Developer ID Application certificates for team 5352PXMNV5 share one name, so name the identity by its SHA-1. Notarization uses a `notarytool` profile instead of variables:
```bash
xcrun notarytool store-credentials heel --apple-id <apple id> --team-id 5352PXMNV5   # asks for a fresh app-specific password
APPLE_SIGNING_IDENTITY=<sha-1> HEEL_NOTARY_PROFILE=heel npm run release:signed
```
`scripts/release-signed.sh` builds with the Developer ID through a config override (local `npm run release` stays ad-hoc), signs the DMG, checks both signatures, then notarizes the DMG, staples the DMG and the app, and asks Gatekeeper. Without `HEEL_NOTARY_PROFILE` it stops after signing. `src-tauri/Entitlements.plist` grants Apple Events under the hardened runtime (Mail, Calendar, Reminders, Notes).

## 0.1.4 release verification (2026-11-12)

The app, bundled `heel-cv-text` executable and Apple silicon DMG are Developer ID signed with the hardened runtime. Apple submission `45889f8f-6a1c-42bb-8e4a-6492b014fef9` returned **Accepted**. App and DMG staple validation passed; Gatekeeper accepted both as `Notarized Developer ID`.

DMG SHA-256: `e58e294cc347919860e4ac6972498b78cabd945e8768d5e896e106b0477c38ca`.

The actual signed reader was executed from the production app with an invalid `DEVELOPER_DIR` and `PATH=/usr/bin:/bin`. Text, scanned and mixed PDFs all extracted successfully; the first signed scan took 28.5 seconds and the subsequent mixed PDF 275 ms. The native panel separately imported text/scanned PDFs through the macOS file picker using its automatically started production helper, preserving unsaved facts and requiring no AI. [Signed-reader proof](proofs/pdf-ocr-2026-11-12/signed-reader.json) · [native proof](proofs/pdf-ocr-2026-11-12/native-ocr.json).

Full suite: 154 files / 792 tests, typecheck and staged secret scan passed. [0.1.4 release](https://github.com/jpoindexter/heel/releases/tag/v0.1.4). The reader requires no tester-side compiler or OCR package. Iris's real CV, other Macs and every job site's behavior remain unverified.

## 0.1.3 release verification (2026-11-12)

The 0.1.3 app and Apple silicon DMG were built with the Developer ID identity below and the hardened runtime. Apple submission `de11164c-559a-4b12-9725-0dc6bddb026a` returned **Accepted**. Both app and DMG were stapled; `stapler validate` passed for each, and Gatekeeper accepted each with `source=Notarized Developer ID`.

DMG SHA-256: `a9ae38b3523e0be86aa6980f86f80455a229752d389ce458429a50dd1ec2fde4`.

The compiled native panel was tested with an isolated bundle identifier and real Codex: fill, correction, native CV picker, zero final submissions before approval, exactly one approved submission, and the visible destination confirmation. The native release test bundle also automatically started its packaged production helper and opened a public HTTPS page. The helper SHA-256 matches between the native test bundle and signed production app: `3e380110afdc476eab94e814595eeee25f1606e61caaf50e0dca34f8f2e444d0`. See [application proof and limits](APPLICATIONS.md). Full suite: 154 files / 785 tests passed; typecheck and staged secret scan passed. The history-only secret scan identified the existing synthetic API-key fixture, not a real credential.

Distribution: [v0.1.3](https://github.com/jpoindexter/heel/releases/tag/v0.1.3). Publishing and downloaded-asset verification are recorded separately in the release proof. The old Help focus/feedback findings and other-Mac acceptance were not rechecked in this release.

## Previous release (2026-11-05)
Heel v0.1.2 was Developer ID–signed and notarized using the validated `heel` Keychain profile and identity `F146F8A6C9E1BC060AE312AA6F4C6D75522C8D75` (team `5352PXMNV5`). Apple submission `16e264a2-6cc9-430d-a648-d7e1b693220c` returned **Accepted**. Both the DMG and app were stapled; `stapler validate` passed and Gatekeeper reported `accepted`, `source=Notarized Developer ID` for each.

DMG SHA-256: `f6026c77a0ce2c36ed8adcab4b3a295fb4c6f361891b267e6b62bce9127ab976`. Test release: https://github.com/jpoindexter/heel/releases/tag/v0.1.2.

Before spending time on a signed release build, validate the existing profile with `xcrun notarytool history --keychain-profile heel`. No password is read into the build shell. The old Vanta profile's rejected authentication was separate from the valid Developer ID signing identity.

Native checks exposed two follow-up findings: Help's focus-ring width token is undefined, and the test Mac's Brave mailto handler accepted the feedback link without creating a draft. See the local handback `handoffs/codex-to-claude-notarize-release-2026-11-05.md` for bounded evidence. Install on another Mac remains unverified.
