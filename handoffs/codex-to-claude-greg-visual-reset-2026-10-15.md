> Superseded artwork direction and inventory: read `codex-to-claude-puppy-full-pack-2026-10-15.md`. The user wants the softer puppy-like mascot. A full34-clip beta pack is now exported; native visual acceptance remains open.

# Handoff: Codex To Claude — Greg visual consistency reset

Date: 2026-10-15, Europe/Madrid
Project: /Users/jasonpoindexter/Documents/GitHub/Greg agent
From: Codex (photo research, generated artwork candidates, asset specification)
To: Claude (current app/platform implementation owner)

## Goal

Make Greg a visually consistent, anatomically believable adult dog across the entire beta repertoire. Jason reports changing colour/design/proportions, moving coat stripes and pixelation. Treat those as open visual defects. More frames or a single large PNG alone cannot establish quality.

## Read First

- User/repository AGENTS.md instructions.
- assets/heel/anatomy-v2-photo-based/UNIFIED-ART-SPEC.md
- assets/heel/anatomy-v2-photo-based/template.json (PROVISIONAL measurements, not accepted calibration)
- assets/heel/anatomy-v2-photo-based/REFERENCES.md
- assets/heel/anatomy-v2-photo-based/qa-review.json
- Earlier handoffs for complete action repertoire and the extra pack; this reset supersedes conflicting compact/short-body/palette instructions.

## Current State

Jason asked Codex to review Google Photos, all angles, then added the cross-animation consistency requirement. The earlier stop was lifted by this request. A Greg search was scrolled to the oldest results and back: 1,567 distinct result links encountered, including videos, repeats, artwork and unrelated text matches. This is not an exhaustive verified count of Greg photos. 21 selected Google Photos files and 11 existing local Greg files were copied/indexed; source files remain preserved.

Private source reference directory: `/Users/jasonpoindexter/Pictures/Greg Heel References/2026-10-15/selected/`.
Index: `/Users/jasonpoindexter/Pictures/Greg Heel References/2026-10-15/selected-references.json` (source photo URL where available, acquisition method, dimensions, SHA256 and use notes).
Contact sheets: sibling `contact-sheets/selected-01.jpg`, `selected-02.jpg`, `selected-03.jpg`, `local-new-photos.jpg`.

Primary body proportion authority is G0032.jpg (clear full standing profile, all feet visible). Supplement with head/ear/muzzle G0024.jpg, opposite head view G0034.jpg, rear G0036.jpg, head/chest G0020.jpg, long forelegs G0043.jpg, curl G0046.jpg, chest/underside IMG_2324.JPG and IMG_2316.JPG. G0020 is LYING, not an upright sitting proportion reference; G0028 is high-angle lying, not standing. One selected source is a lock-screen screenshot: it is supporting face evidence only.

Generated using built-in imagegen:
- `assets/heel/anatomy-v2-photo-based/final/multi-angle-study-v1.png`: nine-view body study; rejected for excessive shading patches and scale drift.
- `assets/heel/anatomy-v2-photo-based/final/multi-angle-study-v2-flat.png`: flatter nine-view review candidate; longer torso and more natural legs, corrected chest placement. It remains an UNAPPROVED MODEL STUDY, not a measured runtime atlas or a new full animation set. It still needs per-view landmark/scale and strict palette checks, anatomy/identity review and alpha-edge QA. No acceptance inferred from generation or file existence.
- Full prompts are saved under `prompts/`. Actual successful inputs were five paths: the standing photo plus four contact sheets, covering all 32 sources. The edit used the candidate, standing/head/chest photos and a contact sheet. The initial seven-path attempt did not run (tool accepts at most five inputs).

No app source changes or commits by Codex in this work. Preserve concurrent Claude/user changes.

## Decisions Made

- One canonical photo-based character model, measured template, locked palette/markings/stroke and constant physical world scale across ALL actions. Use the real adult torso/back/leg structure; discard rejected short side anatomy. Keep natural folded ears, brown eyes, charcoal-grey coat and dark nose/muzzle. Actual irregular lower chest bib, no invented white nose/muzzle or long white throat-to-belly stripe. Subtle natural fur-covered male sheath only where anatomically visible, no exposed organ.
- Keep the full Dot repertoire as the base: nine action families and look directions. Retain six quiet states and the expanded extra/nature scope. More actual in-betweens, natural timing and clean transitions; duplicated/reversed frames must be disclosed and cannot substitute for missing motion.
- One source of truth can export a combined review sheet and multiple bounded runtime atlas pages. Avoid size/colour/style drift between pages. Do not let one massive texture become a prerequisite for coherence.
- Proposed logical cell stays 192x208, root (96,196), ground y196, common safe area. Proposed 2x source is 384x416 per frame. Measurements in template.json are initial calibration proposals, not locked/approved facts. No per-frame occupied-box normalization: a curled dog is naturally smaller in occupied area at the same physical scale.
- Future AI video tooling is optional. No service connected, purchase made or API credential created. Any video output must use the same accepted model and pass temporal, scale, prop-contact and alpha QA before extraction/integration.

## Asset Status And Scope

| Set | Current status | Next dependency |
| --- | --- | --- |
| Dot-compatible 8x11 / 73 populated cells | Historical fallback/integration; side art rejected | Corrected model + dense repertoire authoring |
| smooth-v1 / 96 timed cells | Existing six-state integration; visual reset pending | Same model/palette/scale + transitions |
| extra-v1 / 12 clips / 262 timed cells | Review drafts, anatomy-unapproved; old ZIP predates rejection | Reauthor against shared master, then integrate |
| nature-v1 / four behaviours | Provisional source strips only; carry-stick extraction failed | Corrected master, coherent source art and extraction |
| anatomy-v2 model study | Nine static views, unapproved | Measurements/identity/anatomy/palette review + walk proof |

Extras: pacing, ball play, offer/fetch, play bow, stick chewing, ear scratch, yawn, sniff/search, stretch, paw-over-face error and optional non-graphic poop/pee gags. Nature: sniff trail, nibble grass, pick up stick, carry stick. Keep these in the backlog; do not claim them rebuilt from the new model.

## Platform Evidence And Limits

Current source read confirms Claude already implemented manifest-driven `src/mascot/Sprite.tsx`, `manifest.ts`, `sheets.ts`, `timeline.ts` and `useSpriteClock.ts`. Do not restart the old hardcoded-player migration.

Current source manifest geometry matches `public/mascot/greg.png` (1536x2288, 8 cols, 192x208) and `greg.smooth.png` (3072x1248, 16 cols, 192x208). Direct pixel inspection found ZERO non-transparent pixels on all logical cell borders in both PNGs. Sprite.tsx computes integer cell origins, per-sheet backgroundSize and no-repeat. No `image-rendering: pixelated` rule was found in the searched source.

Those executed source/file checks do NOT reproduce or resolve Jason's native moving stripes/pixelation. They do not exclude internal coat texture drift, wrong state/row selection in a running build, fractional sampling elsewhere, Retina undersampling, colour handling or native compositing. Keep root cause open until real-window observation.

Current schema uses uniform grid rows and `frames <= columns`, with no source-density field, per-frame packed rectangle, atlas page or root metadata. Any adoption of 2x textures/packed pages needs an intentional matching extension. Keep displayed logical dimensions and alpha hit region consistent; do not replace a PNG while leaving incompatible geometry in the manifest.

## Trello

Board: https://trello.com/b/pbqxn0aI/greg-agent-nd-desktop-companion

Created and read-back verified:
- A5 visual reset: https://trello.com/c/S8JdeGot
- A6 twelve extras: https://trello.com/c/F0816jgq
- A7 four nature behaviours: https://trello.com/c/mAM5xYCB

17 existing related card descriptions updated and read-back verified: mascot decision D5; A1; A2; A3a; A3b; A4a; A4b; A4c; A4c remainder 16b; A4d; V1-11; V1-8; V1-7; D4 interrupt policy; S8; R1; F9. Existing completed integration statuses were preserved. No unrelated cards moved/reprioritized, no new art marked Done. Audit: assets/heel/anatomy-v2-photo-based/trello-update-audit.json.

## Files Changed

- New `anatomy-v2-photo-based/`: source authority notes, unified spec, provisional numeric template, prompts, generated model candidates, QA report and Trello audit.
- `anatomy-v1/PHOTO-REFERENCE-REVIEW.md`: resumed all-angle reference review ledger.
- New handoff (this file); earlier two handoffs get a pointer to this superseding reset.
- Private Pictures reference directory contains originals/viewer-resolution media and contact sheets; private source photos were not uploaded to Trello or committed.

## Open Questions

- Does the revised model match Greg's actual identity/body from ALL angles? Candidate remains unapproved.
- What exactly causes the stripes/pixelation in the installed app? Not reproduced by Codex. Capture the action/frame/device scale and compare source vs displayed image before fixing.
- Final measured master dimensions, strict palette and 1x/2x runtime layout remain to be frozen after visual review. Platform implementation may continue independently of unfinished art.

## Next Exact Task

Claude: reproduce and record the current stripe/pixelation issue in the REAL native window using the current fallback and its correct manifest. Record action/frame, device pixel ratio, logical/displayed/source sizes and screenshot/video. Compare the extracted source cell at matching scale. Fix confirmed renderer/manifest/scaling defects within your platform branch, then replay all affected actions and transitions. Keep the art rejection and unapproved candidate status visible.

Art pipeline: review the v2 study against primary photos; lock one correct neutral master and measured landmarks/palette; create one genuine walk proof with fixed physical scale and foot contact; then reauthor core, quiet, extra and nature animations from that same master. Export through a single manifest/packing pipeline and run per-frame plus real-window checks before replacing fallback. Do not produce hundreds of additional inconsistent frames first.

## Constraints

- Preserve all existing variants and concurrent app work. Do not promote v1, v2 or previous anatomy candidates as approved.
- Actual dog photos outrank generated references. No raster stretching/limb warping or per-frame auto-fit to conceal anatomical drift.
- Quiet defaults, Calm/Lively/Off, focus/typing/panel guards, deliberate reduced-motion held poses. Optional toilet gags stay manual/opt-in and non-graphic; real errors retain actionable text. Props clear on completion/interruption.
- Smoothness judged on actual motion/loop/state transitions, not counts alone. Test at 128px and actual native/Retina scale, light/dark, including tails/paws/props and alpha edges.

## Verification Already Run

- Google Photos UI: broad Greg search scrolled to oldest results and back; selected files downloaded via UI/full viewer media. Partial thumbnail downloads detected by dimensions and replaced with full viewing resolution. Image files decoded and dimensions/hashes indexed; 21 cloud + 11 local sources. This does not prove exhaustive search recall or identity of every search match.
- Contact sheets visually reviewed across front, profiles, rear, rest/curl and underside. This is photo reference evidence, not approval of generated anatomy.
- Current public PNG dimensions and all cell-border alpha values checked directly. No native-window stripe/pixelation test or fix claimed.
- Trello full board read-back: 17 exact updated descriptions + 3 exact created descriptions matched; no list pagination remained. New cards are open.
- Generated studies viewed; v1 tonal/scale defects recorded; v2 still pending formal calibration and acceptance. No animation replacement implemented or verified from this new study.

## Return Format

Return exact changed files/asset hashes, observed before/after native-window evidence, which failure was reproduced and fixed, any remaining palette/anatomy/scale or motion defects, and which Trello acceptance criteria were executed. Distinguish platform fixes, art candidates and accepted integrated animations.
