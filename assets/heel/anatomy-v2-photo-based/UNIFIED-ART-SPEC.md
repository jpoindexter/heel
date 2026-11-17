# Greg unified beta artwork contract

2026-10-15. Jason reports colour/design/proportion drift, stripes while moving and pixelation. These are open visual defects. More frames and one large PNG alone do not establish consistency.

## Source of truth

Use one photo-based character master, one measured template, one palette and one manifest across every animation. Preserve the Dot action repertoire and look directions, quiet six states, all 12 extra behaviours and the four nature behaviours. Previous side-view drafts are rejected and must not become the new master.

Reference photos and their limits: REFERENCES.md. Photo authority overrides earlier generated anatomy and white markings. Physical body dimensions stay constant as the pose changes. Never resize each frame to fill its bounding box; a curled dog must occupy less space than an upright dog at the same scale.

## Provisional calibration template

Logical frame: 192 x 208 px, matching the current app's frame size. Ground baseline: y=196. Ground/root origin: (96,196). Safe artwork rectangle: x=12..180, y=12..196. Reserve clearance for tail, toes, lifted paws and props. A jump intentionally lifts the dog above the same ground plane.

Initial photo-calibrated targets for the neutral standing profile: full nose-to-tail silhouette about 168 px wide and 108 px high; projected head about 44 px wide; shoulder-to-hip separation about 80 px. These are proposed artwork measurements, not measured biological facts. Review the neutral master against G0032 before freezing the numbers. Record the accepted master head, shoulder, elbow, hip, stifle, hock and paw landmarks in template.json. Keep visible anatomy natural, including a subtle fur-covered male sheath when the pose exposes it.

Keep the same world scale and stroke weight across sitting, lying, walking and curled poses. Record camera/foreshortening explicitly. Do not force projected head width to be identical at different yaw angles, or stretch a pose to reach a numeric target. Check head/body/leg relationships visually as well as numerically.

## Locked beta palette and finish

Proposed base coat #555A5D; one shadow #464B4E; outline #303638; nose #252A2C; warm brown iris #604638; white marking #E8E5DD; muted tongue/inner ear #A77F83 where needed. Review once on the master, then freeze and store exact values. No brown/olive alternate body palettes, fur texture, grain, hatching, stripes, extra shading bands, sharpening halos, green spill or background shadow. Do not silently recolour each clip independently. Use image generation for artwork corrections; retain originals.

Outline target: 2 px at 1x (4 px in 2x source), smooth antialiasing. Produce lossless RGBA PNG masters, with genuinely transparent backgrounds. The irregular chest bib follows the real photos; no white nose, pale muzzle or invented continuous throat-to-belly stripe.

## Export strategy

One master source and manifest; deterministic packing. Export a combined contact sheet for review. Use bounded atlas pages for runtime when the full repertoire is too large. Proposed 1x page capacity: 16 columns x 19 rows = 3072 x 3952, 304 slots; matching 2x source page = 6144 x 7904. Cap pages below the actual renderer/device texture limit and measure decoded memory. These page dimensions are a proposal, not an existing implementation or device capability claim.

Store each frame's atlas page, source pixel rectangle, source density, logical dimensions, ground/root anchor, per-frame duration, action, loop/one-shot policy and entry/exit pose. Prefer lossless PNG for beta. Keep transparent clearance around every frame; if a renderer requires filtering gutters, encode stride and inner rectangle separately rather than pretending the gutter is art. Explicitly clear unused slots.

At 2x, source rectangles and texture dimensions are physical pixels; the displayed frame and hit region remain 192 x 208 logical pixels. Claude must extend the current manifest/player consistently before adopting 2x assets or packed non-row layouts. Never simply drop a differently sized PNG into the current manifest. Keep current fallback assets unchanged until the replacement passes real-window checks.

## Motion and consistency acceptance

- Same Greg, palette, markings and physical scale through every frame and state switch. No body length pulses, moving coat bands, jowl inflation, changing paw size or tail attachment drift.
- Author contact, passing, lift and recovery poses; smooth timing, foot contact, turns, loop seams, prop contact and sit/lie/wake transitions. Duplicating frames or raising a timer's FPS cannot repair missing poses. Preserve calm holds and disclose reversed/mirrored/reused frames.
- Compare every frame on a baseline/landmark overlay and contact sheet. Measure palette drift and landmark/scale drift with pose-aware exceptions; do not treat different silhouettes as automatic failures or passing geometry as anatomical approval.
- Test every action and transition in the real app at 128 px and native display size, light and dark desktops, Retina and ordinary scaling where available. Check for adjacent-row bleed, fractional sampling, wrong frame rectangles, nearest-neighbour scaling and colour/compression artifacts. Capture the reported stripe defect before deciding whether art, packing, scaling or playback caused it.
- Loop boundaries and one-shot completion observed; no clipping of paws/tails/props; reduced motion is a deliberate held pose; no optional roaming during focus, typing, panel use or Off.

## Current executed evidence

Source read on 2026-10-15: Claude has already implemented a manifest-driven player and separate Dot/smooth manifests. Sprite.tsx uses each manifest's cell geometry and background size. Current PNGs are 1536x2288 and 3072x1248, matching their definitions. Pixel inspection found zero non-transparent pixels on cell borders in either current PNG. This rules out neither live sampling defects nor colour/texture drift inside frames. The reported native-window stripe/pixelation defect has not been reproduced or fixed by Codex. No app source changes made.

## Later video tooling

An AI video tool can supply candidate motion later. No service has been connected or purchased. Require the accepted master, fixed camera/palette/scale, frame extraction, alpha and temporal consistency QA before its output becomes production sprite art. Keep the beta pipeline reviewable without depending on that future integration.
