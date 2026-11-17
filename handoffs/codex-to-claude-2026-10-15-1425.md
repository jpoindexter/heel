> Superseded artwork direction and inventory: read `codex-to-claude-puppy-full-pack-2026-10-15.md`. The user wants the softer puppy-like mascot. A full34-clip beta pack is now exported; native visual acceptance remains open.

# Handoff: Codex to Claude — Greg / Heel animation assets

**Superseded visual direction:** read `codex-to-claude-greg-visual-reset-2026-10-15.md` first. It records 32 real-photo references, the all-angle correction, a shared measured template/palette/scale, stripe/pixelation investigation, and 20 verified Trello card updates. The new nine-view studies are candidates, not an accepted atlas. Preserve this handoff's action inventory, but use the new reset's constraints.

## Blocking user correction: side-view anatomy

Jason rejected the side-view body: torso too short, limbs/body do not look like a real dog. **Do not integrate the current pacing/side-view/nature drafts as accepted artwork.** Earlier frame/count checks did not establish anatomy. Correct the longer adult torso, shoulder/hip separation and canine limb articulation from Greg's real photos first; inspect neutral side stance and a short walk before propagating the body model. Current correction work is in `assets/heel/anatomy-v1/`. Nature behaviours (sniffing around, nibbling grass, picking up/carrying sticks) remain requested, but their current provisional sources are anatomy-unapproved. This overrides all earlier instructions asking for a compact/short side body.

Date: 2026-10-15 14:25 Europe/Madrid
Project: `/Users/jasonpoindexter/Documents/GitHub/Greg agent`
From: Codex
To: Claude, already implementing Heel

## Extra behaviours — latest additional handoff

Twelve new generated animation drafts now exist. Read `handoffs/codex-to-claude-extra-behaviours-2026-10-15.md` alongside this core plan. It contains the actual sprite pack, pacing/props/trigger integration requirements, executed checks and remaining visual polish. These extras add to the full Dot repertoire; they do not replace the nine-action/direction smoothing task below.

## Latest user decision — full Dot repertoire with denser animation

Jason now explicitly requests **all Dot animations to be smooth, with more frames**, and asks for this requirement in Claude's handoff. Preserve the full Dot action/direction repertoire; the six-state dense sheet alone is not the final animation scope.

Important format distinction: the standard Dot v2 atlas is fixed at 8×11 cells and cannot hold 16–24 frames in each action row. Keep that compatible export intact as a fallback. Build a **custom denser atlas/manifest containing the full Dot repertoire** for Heel, updating playback to support its geometry. Do not describe the custom format as compatible with the standard Dot uploader.

**Status: this is the next authoring/integration task, not an already-produced asset.** The existing full Dot sheet remains sparse; only the separate six-state sheet currently has sixteen timed frames per row. No new full-repertoire frames or app source changes were made by Codex for this handoff update.

Claude is already auditing the panel flow. Jason pasted Claude's progress: a seeded throwaway environment exposed clipped content, offscreen replies, focus/session wording contradictions, missing ask-box focus and panel-placement issues; Claude was cleaning up the helper and writing a flow report. These are **Claude-reported findings, not independently verified by Codex**. Preserve that report and current work, then continue the animation task. This handoff does not authorize discarding the review, resetting source, modifying real task data, or silently expanding into a panel redesign.

## Goal

Continue your current Heel implementation with **the full Dot repertoire in a denser Greg animation set**, using the existing Dot-compatible artwork as the reference and fallback. Jason's latest quality requirement is that the animation should feel smooth, with enough real in-between poses to avoid a janky appearance. This handoff transfers assets and evidence; it does not establish that they are integrated or visually approved in the running app.

## Read first

- Applicable project/global instructions (including Jason's AGENTS.md instructions).
- `src/mascot/atlas.ts`, `Sprite.tsx`, `Mascot.tsx`, and `atlas.test.ts`.
- `src/panel/TodayTab.tsx`.
- `assets/heel/smooth-v1/final/README.md`.
- `assets/heel/smooth-v1/qa/final-review.json`.
- `assets/heel/smooth-v1/final/compatible-dot/dot-animations.json` (primary).
- `assets/heel/smooth-v1/final/heel-animations.json` (optional dense extension only).

The handoff skill references `docs/04-technical/model-and-effort-routing.md`, but that file is absent in this checkout. No Claude CLI or second implementation session was launched.

## Current state: two different atlas formats

### Optional denser six-state Heel artwork

Directory: `assets/heel/smooth-v1/final/`

- `heel-smooth.png` and `.webp`: transparent **3072 × 1248**.
- **16 columns × 6 rows**, each cell **192 × 208**.
- Rows 0–5: **idle, listening, focus, nudge, done, rest**.
- **96 timed cells**. Five rows have 16 generated drawings each. Done uses eight generated drawings forward and reversed for its return stroke, yielding 16 timed cells. This is intentional and disclosed, not 16 unique drawings.
- `heel-animations.json` contains exact `durationsMs` arrays. Preserve these quiet holds and motion timings; do not replace them with an arbitrary uniform frame rate.
- `frames/<state>/00.png` through `15.png` and `strips/<state>.png` are extracted from the cleaned final atlas.
- `previews/` contains individual labeled GIFs and `all-states.gif` / `.mp4`.
- `preview.html` is the standalone player, including frame stepping, 128px rendering and a dark backdrop.

Current local preview: <http://127.0.0.1:8876/assets/heel/smooth-v1/final/preview.html>. The server is session-dependent. If it is gone, serve the repository through a local static server; do not assume the running app uses port 8876.

Pack: `assets/heel/smooth-v1/greg-heel-animation-pack.zip` (**18,792,851 bytes** when packaged). Includes final assets, compatibility atlas, and selected QA. Raw/rejected authoring files are excluded.

### Full Dot-compatible Greg atlas — reference and fallback

`assets/heel/smooth-v1/final/compatible-dot/` preserves the earlier validated atlas:

- `spritesheet-extended.png` / `.webp`: **1536 × 2288**, **8 columns × 11 rows**, cells **192 × 208**, **73 populated cells**.
- Nine action rows (4–8 frames each), plus sixteen look directions across rows 9 and 10.
- Actions: idle, run right, run left, paw lift, jump, deflated/recover, waiting, focus/processing, review.
- These are more action types, not more frames per action. The smoothness requirement remains: assess actual loops before claiming it is satisfied.
- Its `dot-animations.json` applies only to this geometry.
- PNG SHA-256: `4353761c6e78bdaf0a5673aac3c54025a61bd841af4d1fc9dcf673b1b3c5e68a`.
- Full original export and richer validation remain at `assets/heel/animation-v1/final/` and its sibling `qa/`.

**The 16-column Heel atlas is not a drop-in PNG replacement for the existing 8-column renderer.** The compatible Greg atlas can fit that geometry, but it does not provide the denser six-state motion set.

## App integration observed at handoff

This is a live snapshot; re-read before editing because Claude is actively working:

- `src/mascot/Sprite.tsx` still points at `/mascot/riff.png`.
- `src/mascot/atlas.ts` hardcodes 8 columns, 11 rows and Dot timings. Its comment that Greg's future export has the same geometry applies to the compatible atlas, not the denser one.
- `framePosition()` uses `% COLUMNS` and special handling for sixteen look frames across two rows.
- Current product mappings: idle→idle, listening→waiting, thinking→running, greeting→waving, done→jumping, error→failed.
- `Mascot.tsx` uses `MotionName` events and a greeting one-shot whose timeout comes from `motionDuration()`.
- `TodayTab.tsx` emits the existing mapped motion names.
- Current app has no focus/nudge/rest mappings matching all six dense rows. In particular, the dense Done is a quiet contented wag, not the current jump; Rest is the Off/low-energy curled sleeping pose.

Keep full Dot action/directional behavior. Preserve the original Dot geometry for the compatible fallback; the requested denser full-repertoire renderer must support a different explicit manifest. Coordinate any mapping changes across renderer, events, one-shot durations and panel controls. If adding dense Rest, quiet Done or other six-state clips later, give those an explicit separate atlas definition. Never interpret dense frames with Dot geometry. The primary Dot atlas has no dedicated curled-up Rest row; preserve that requirement as an optional extension rather than pretending an existing action is sleep.

## Visual decisions / constraints

- Greg is a broad-headed, stocky grey dog with natural folded ears and a narrow irregular white chest bib.
- **Coat: charcoal grey, more grey than brown. Nose, bridge and muzzle are dark; no white muzzle, white nose or pale blaze. White only under chin/on chest.**
- Calm rounded illustration, low saturation, simple shading. No headphones, collars, props, sparkles, confetti, hearts or motion lines.
- Original approved design references: `assets/heel/v3-charcoal/character-sheet.png` and `desktop-states.png`.
- Real Greg references: `assets/heel/v1/references/` (portrait, wet photo, resting photo). Do not use the wet dog's equipment/background as character features.
- Riff is Jason's existing OpenAI Dot. Original retained at `assets/riff/riff-original-spritesheet.png`. Do not modify his account pet or overwrite Riff's source artwork.
- Earlier variants and failed attempts are retained. Do not delete them or treat them as accepted production assets.

## Decisions made and known limitations

Fine painted texture flickered between generated frames. The denser rows use a flatter coat pass and shared registration. Only extraction, uniform row scaling, whole-frame translation, chroma cleanup and packing transformed the generated pixels; no synthetic limb warping or optical-flow frames were added.

Remaining issues to assess honestly in the actual app:

1. Small generated outline/shape variation remains. **More frames alone does not prove smoothness.**
2. Focus has a slightly warmer/olive grey than seated Idle. Further palette matching may be worthwhile; Jason asked for grey.
3. State switches currently have no authored transition clips, so a smooth loop does not guarantee a smooth sit-to-lie or wake-up transition.
4. Dense locomotion experiments were rejected for body/paw pops and are not in either accepted final sheet. Do not use `smooth-v1/registered-gait/` or its draft `running-right` sources as accepted animation.
5. The standalone player's reduced-motion code exists, but system-setting changes were not exercised end-to-end. Validate it in the actual app.

## Verification already run

Executed for the denser export:

- `python3 assets/heel/smooth-v1/package_smooth.py`: produced final atlas, exact-cell frames/strips, contact sheet, GIFs and MP4.
- `qa/structural-validation.json`: 96 populated cells, correct dimensions, no blank or clipped cells under its margin check. This is geometry proof, not smoothness proof.
- In the standalone browser player, selected all six states, stepped each through 16 frames and observed wrap to frame one / original offset.
- Timed autoplay observed for Done and Focus at multiple nonzero frame indices.
- Final contact sheet inspected. Native and 128px Focus rendering, and dark-background Done/Focus inspected.
- ZIP integrity passed; 96 individual frame PNGs present.
- `ffprobe` read the MP4 as H.264, 384×256, duration 19.45 seconds. This is decode/metadata evidence, not app playback evidence.

For the separate compatible atlas, prior bundled atlas/quality/direction checks and the Pets validation tool passed on its exact final PNG. Full reports are retained under `assets/heel/animation-v1/qa/` and `final/`. Its checksum is unchanged in the new pack.

**Not executed by Codex:** integration into React/Tauri, native desktop state/event behavior with Greg, app performance, all app transitions, production packaging, or Jason's visual acceptance. No app build/typecheck/test claim is made by this asset handoff.

## Files changed / concurrent work

Codex's artwork work is under `assets/` plus this new handoff. No app source changes are part of this handoff.

At this update, `git status --short` showed `?? assets/`, `?? flow-report.html`, and `?? handoffs/`. Preserve Claude's `flow-report.html` and current app work. Source status has changed during Claude's implementation, so re-read before editing; do not reset anything based on older snapshots. No commit was created by Codex.

## Next exact task — author and integrate the denser full set

First finish saving your current flow-review evidence. Then review the existing Greg full Dot repertoire in the actual app and author the missing in-between poses. Keep the full action set; do not satisfy this request by swapping to the existing six-state sheet or merely slowing down the sparse atlas.

### Frame targets

These are authoring targets, not evidence of smoothness. Count actual coherent drawings and disclose any intentional forward/reverse reuse separately from timed frame cells.

| Dot motion key | Target authored poses | Motion checks |
| --- | ---: | --- |
| `idle` | 16 | Small breath/blink; stable feet, head volume and white bib |
| `running-right` | 24 | Full articulated gait, stable body mass, consistent foot contacts |
| `running-left` | 24 | Matching leftward gait; preserve Greg's markings |
| `waving` | 16 | Continuous paw lift, hold and return; no first-frame paw jump |
| `jumping` | 24 | Anticipation, takeoff, airborne arc, landing and settle; stable scale |
| `failed` | 16 | Gentle deflation and recovery, without exaggerated distress |
| `waiting` | 16 | Gradual head tilt and return; consistent face and body |
| `running` (processing/focus) | 16 | Chin-on-paws presence/slow blink; this is not another locomotion row |
| `review` | 16 | Small thoughtful scan/attention shift and clean loop seam |

Directional looks: preserve all sixteen existing semantic directions and their clockwise order. Target **32 coherent angle samples** (11.25-degree spacing) to reduce stepping, keeping the original sixteen directions as every-other-sample anchors. Keep the body still and express the look through believable eyes/head movement. Test the 360→0 wrap and rapid pointer changes; do not play a continual spinning loop as idle behavior.

This target totals 168 action poses plus 32 directional samples, before optional extra states. Reuse accepted dense artwork only where identity, palette, motion and semantics match after actual review. Do not promote the rejected gait drafts just because they have more cells. Keep existing Rest and quiet Done assets available as explicitly separate additions; the standard repertoire has no dedicated curled-sleep row.

### Layout and player

A workable proposed custom layout is **24 columns ×11 rows**, 192×208 cells (4608×2288): nine action rows, then directional samples 0–23 in row 9 and 24–31 in row 10. Unused cells remain transparent. This is a proposal for the custom Heel export, not the fixed standard Dot contract. A different explicit manifest layout is fine if it is simpler for the current code.

- Store actual frame counts, frame rectangles/positions, per-frame durations, loop versus one-shot behavior, and direction angles in a manifest. Avoid hardcoded `% 8` and sixteen-look assumptions in the custom player.
- Preserve the original 8×11 atlas/manifest unchanged as a compatible fallback. Do not overwrite `riff.png` or Riff's source.
- Preserve event names where possible; coordinate any necessary changes across renderer, panel controls, direction tracking and `motionDuration()`/one-shot completion.
- Use a monotonic elapsed-time timeline and the browser animation scheduler for playback; avoid chained timers accumulating drift. Render scheduling at 60Hz does not create missing drawings. Pause/suspend unnecessary offscreen animation and handle reduced motion explicitly.
- Author easing, anticipation, follow-through and quiet holds in the pose/timing sequence. Keep appropriate loop lengths; adding frames must not make a paw lift or jump arbitrarily slower.
- Lock scale, floor/foot anchors, palette, muzzle/chest markings and silhouette identity. Avoid painted texture flicker. Do not inflate counts with arbitrary duplicates, dissolve between incompatible poses or use unreviewed limb-warp interpolation.
- If generation capability is unavailable in Claude's environment, implement the player/manifest support and report the precise missing art deliverable. Do not claim code or repeated frames have supplied the new poses.

### Observable finish line

- Deliver the new full-repertoire custom PNG/WebP atlas, manifest, per-action previews/contact sheets and retained compatible fallback. Label generated, reused and unfilled frames honestly.
- Run the actual Heel desktop mascot with Greg loaded, correct frame cells/timing/transparency and no clipping. Exercise every action and the complete direction range through real app triggers.
- Watch at least three complete cycles of each loop at actual desktop size (including 128px) on light/dark backgrounds, with attention to last→first boundaries. For one-shots, watch anticipation through recovery and return to the base state. Inspect at normal playback and frame-step suspicious boundaries.
- Test direction wrap, rapid direction changes, idle→action→idle, focus entry/exit, and any implemented sleep/wake transitions. Avoid snapping or continually drawing attention.
- Check actual playback scheduling/frame pacing in the running app, including CPU/busy-panel conditions, without altering Jason's real task data. Record measured behavior rather than assuming dense art solves runtime stutter.
- Verify reduced motion, click/drag/panel behavior, state events and one-shot completion; run relevant tests/typecheck/build after changes.
- Report any visible pops, colour flashes, shape changes, missing frames or app checks not performed. Frame counts, a passing validator and a green build cannot establish that every animation feels smooth.

## Return format

Give Jason the integrated result and a brief report: files changed, real desktop checks performed, tests run, remaining visible issues. Keep the work focused on the implementation you are already making.
