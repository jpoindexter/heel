#!/bin/sh
# A Heel build other Macs can open (docs/RELEASE.md): Developer ID signature with the hardened runtime,
# the DMG signed too, and — when HEEL_NOTARY_PROFILE names a `xcrun notarytool store-credentials` profile —
# notarized, stapled and checked by Gatekeeper. Local builds stay ad-hoc (`npm run release`).
set -eu

: "${APPLE_SIGNING_IDENTITY:?Set APPLE_SIGNING_IDENTITY to your Developer ID Application identity (its SHA-1 from security find-identity -v -p codesigning when two share a name).}"
BUNDLE=src-tauri/target/release/bundle
APP="$BUNDLE/macos/Heel.app"
VERSION=$(node -p 'require("./package.json").version')
DMG="$BUNDLE/dmg/Heel_${VERSION}_aarch64.dmg"

npx tauri build --bundles app,dmg --config "{\"bundle\":{\"macOS\":{\"signingIdentity\":\"$APPLE_SIGNING_IDENTITY\"}}}"
codesign --force --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$DMG"
codesign --verify --deep --strict --verbose=2 "$APP"
codesign --verify --verbose=2 "$DMG"

if [ -z "${HEEL_NOTARY_PROFILE:-}" ]; then
  echo "Signed, not notarized: set HEEL_NOTARY_PROFILE to notarize. Testers open it once via System Settings › Privacy & Security › Open Anyway."
  exit 0
fi
xcrun notarytool submit "$DMG" --keychain-profile "$HEEL_NOTARY_PROFILE" --wait
xcrun stapler staple "$DMG"
xcrun stapler staple "$APP"
spctl --assess --type open --context context:primary-signature -vv "$DMG"
spctl --assess --type execute -vv "$APP"
echo "Notarized: $DMG"
