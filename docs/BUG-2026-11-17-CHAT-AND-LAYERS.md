# Chat screenshots and overlapping panels

Outcome: dropping or pasting a screenshot into chat shows a removable preview, sends the selected image only with an explicit message, and produces a real vision answer. Task-list navigation and update status remain readable at the minimum panel size.

Target: report 47e14566-1bbb-4563-ac44-470c803a0bcb (reported app 0.1.5, Codex, helper reached, no crash); released in 0.1.7.

Now: reproduced screenshot rejection and composer overlap; implemented the image contract/importer, current-exchange image retention and explicit-send provider delivery. Browser and native checks executed. The 0.1.7 production app/DMG are Developer ID signed and notarized; the release and automatic-update feed are published, and all four public assets were independently downloaded and verified.

Next: Iris can install the [0.1.7 DMG](https://github.com/jpoindexter/heel/releases/download/v0.1.7/Heel_0.1.7_aarch64.dmg) or use the updater. Collect tester-device feedback against the remaining native limits below.

Must: no image upload on drop/paste/import; no source overwrite; no private screenshots in tests, logs or reports; preserve task state, message history, failed-turn retries and explicit restart approval. Keep existing untracked assets/ and handoffs/ untouched.

Must not: publish over 0.1.6 assets, introduce API-key requirements or broaden filesystem permissions.

Authority: user supplied the screenshot bug report and explicitly requested fixes to the update indicator and overlapping panels. Publication follows the existing user request to deliver the photo update to Iris through the updater; this run is limited to these requested screenshot and readability fixes. No standing permission for unrelated releases is inferred.

Later: Iris device feedback, native physical Finder drag/bitmap paste and VoiceOver verification.

Re-entry: this file, git status, chat composer -> useThread -> /turn -> runTurn; layers.tsx/layers.css and Panel/UpdateStatus.

Done evidence: synthetic screenshot drop/paste preview, zero provider calls until Send, actual image pixels at the provider, in-place failed-message retry retains image; reverse-order layer navigation shows only the active surface and restores focus; no content/update controls overlap or overflow at 280x320 and normal panel sizes. Native evidence and browser doubles are reported separately.

Executed proof: [browser/native verification](verification/chat-layout-2026-11-17.json). The native file chooser stayed open beyond the idle timeout, attachment preview appeared, and the actual Codex subscription identified the synthetic blue circle, red square and BLUE 7. Cmd+, opened Settings over Reply without the old reply/composer remaining visible; Back restored the reply. The test app was isolated and was quit without installing the offered production update.

Release proof: [0.1.7 public download, signing, notarization and feed checks](verification/heel-0.1.7.json). Apple accepted submission `147ef6af-d91d-41e4-a483-21526f141d65` on retry with the existing saved credentials.
