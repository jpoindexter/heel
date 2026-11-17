# Greg: full puppy-style beta animation pack

Latest art direction: softer, rounder, friendlier puppy-like Greg in the original illustrated mascot family. The realistic anatomy studies are supporting references only. This pack supersedes the earlier art-reset dependency for generating the repertoire; it does not establish native integration or final visual acceptance.

**34 clips, 768 timed frames, 648 generated source poses.** Walk-left mirrors walk-right. Pacing combines right walk, turn, left walk and mirrored turn; its 96 frames are not 96 new generated drawings. All requested behaviour families are represented.

## Open first

- `final/preview.html`: play, pause, replay, scrub, warm/dark/checker background, 192px/128px mascot viewport.
- `final/all-animations.png`: one pose per animation.
- `final/manifest.json`: authoritative animation timing, loop flags, per-frame atlas rectangles and root offsets.
- `final/validation.json`: executed file/atlas checks.
- `../../../handoffs/codex-to-claude-puppy-full-pack-2026-10-15.md`: integration handoff.
- `greg-puppy-full-beta.zip`: portable runtime art/previews/manifest/handoff, with private real-photo files excluded.

Serve the repository root, then open `http://127.0.0.1:8876/assets/heel/puppy-v1/final/preview.html`. Plain file opening can block fetch in some browsers. The existing local preview server uses port8876.

## Export geometry

All logical frames192×208, ground y196, anchor(96,196). Three bounded atlas pages: 3072×3328, 3072×3328, 3072×3328; matching2× PNG pages and lossless WebP pages. Source frame resolution varies;2× resampling does not invent new detail. Alpha is real transparency. Magenta keying and edge-only matte despill were applied; no limb warps or frame morphing.

`final/frames/<clip>/` holds1× PNG frames and `final/frames-2x/<clip>/` holds2× PNGs. `final/animations/` contains transparent animated WebP and solid-matte GIF previews. GIF pacing includes root travel; WebP shows the source poses in place. Use the JSON manifest for exact timing/root behaviour. `final/greg-dot-compatible.png` plus `dot-compatible.json` provides the nine base action families plus look poses in a32-column,10-row uniform grid. It is not a drop-in replacement for the old8-column sheet without updating its manifest.

## Full inventory

| Animation | Timed frames | Duration | Playback |
| --- | ---: | ---: | --- |
| `idle` | 16 | 2.67s | Loop |
| `walk-right` | 24 | 1.49s | Loop |
| `ball-play` | 32 | 2.58s | One-shot / gaze targets |
| `listening` | 16 | 2.00s | Loop |
| `focus` | 16 | 2.67s | Loop |
| `nudge` | 16 | 1.88s | One-shot / gaze targets |
| `done` | 16 | 1.88s | One-shot / gaze targets |
| `rest` | 16 | 2.67s | Loop |
| `wave` | 16 | 1.88s | One-shot / gaze targets |
| `jump` | 16 | 1.88s | One-shot / gaze targets |
| `error` | 16 | 1.88s | One-shot / gaze targets |
| `review` | 16 | 2.00s | Loop |
| `fetch-offer` | 24 | 2.08s | One-shot / gaze targets |
| `play-bow` | 24 | 2.08s | One-shot / gaze targets |
| `chew-stick` | 16 | 1.33s | Loop |
| `scratch-ear` | 16 | 1.88s | One-shot / gaze targets |
| `yawn` | 16 | 1.88s | One-shot / gaze targets |
| `sniff-search` | 16 | 1.33s | Loop |
| `stretch` | 24 | 2.08s | One-shot / gaze targets |
| `error-facepalm` | 16 | 1.88s | One-shot / gaze targets |
| `poop-gag` | 24 | 2.08s | One-shot / gaze targets |
| `pee-gag` | 24 | 2.08s | One-shot / gaze targets |
| `sniff-trail` | 24 | 1.49s | Loop |
| `graze-grass` | 24 | 2.08s | One-shot / gaze targets |
| `pick-up-stick` | 24 | 2.08s | One-shot / gaze targets |
| `carry-stick` | 24 | 1.49s | Loop |
| `sit-down` | 24 | 2.08s | One-shot / gaze targets |
| `lie-down` | 24 | 2.08s | One-shot / gaze targets |
| `curl-up` | 24 | 2.08s | One-shot / gaze targets |
| `wake-up` | 24 | 2.08s | One-shot / gaze targets |
| `turn-around` | 24 | 2.08s | One-shot / gaze targets |
| `look-directions` | 16 | 4.00s | One-shot / gaze targets |
| `walk-left` | 24 | 1.49s | Loop |
| `pacing` | 96 | 7.20s | Loop |

Aliases cover Dot's running-right/left, waving, jumping, failed, waiting, running/processing, review and idle. `running` means calm focus/processing rather than endless physical running. Six quiet states: idle, listening, focus, nudge, done, rest. Gaze targets stay seated; they are not a spinning dog.

## Consistency and motion limits

One canonical image and shared prompts guided every action. Approximate head measurements set one scale per whole clip; no per-frame occupied-box normalization. The source images are retained under `decoded/`, prompts in `jobs.json`, scale estimates in `calibration.json`, extraction reports/contact sheets in `qa/`. This is a common export template, not proof of exact identical generated anatomy or colour. Minor shape/colour changes remain; do not market this as a perfectly rigged character.

Known review points: pacing's authored turn has a visible pose/proportion difference from the walking source; strict off-state sleep may need the occasional eye-opening removed or regenerated; the16 gaze drawings are not measured angular calibration; curl-up has an intermediate raised posture. These are beta polish items, not missing animation categories. Individual one-shots can begin/end in different poses from the current app state; state transitions need an intentional entry/exit policy, not arbitrary hard cuts. Do not claim 60 unique drawn frames per second: sources contain16–32 poses per authored action, displayed at6–16fps with endpoint holds.

## Verification

Executed:32 source sheets had the expected connected dog counts; all32 extracts passed nonblank/bounds checks after registration correction; all768 packed atlas cells equal their saved individual frames byte-for-byte; all outer cell borders have alpha0. Browser player loaded34 clips, loop counters advanced, and one-shots reached final frames. Reviewed source pose sheets and loop endpoint comparison; warm native-size and dark128px previews were inspected. These checks do not establish continuous perceptual smoothness, exact identity at every angle, or a native-app fix. `qa/browser-playback.json` records the browser sample.

Claude owns native integration. Preserve current app changes and fallback assets. Reproduce reported movement stripes/pixelation in the actual native window, recording action/frame/DPR and comparing source pixels against display. A passing atlas check does not close that defect. Optional antics should respect focus/Off/reduced-motion and should not interrupt work. Bathroom gags should be opt-in. No account-pet upload, external video service, credentials or purchase is part of this pack.
