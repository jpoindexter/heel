# Greg — extra behaviour animation drafts

Twelve generated clips for Claude to integrate and polish. These are reviewable sprite animations, not a claim of final smoothness in Heel.

`greg-extras.png` / `.webp`: transparent3072×3536 custom atlas,16columns,192×208 cells. This is not the fixed8×11 Dot upload layout. Keep the original compatible atlas and the full-repertoire smoothing task.

`animations.json` supplies frame rectangles, durations, loop/one-shot flags, root travel anchors, trigger suggestions, cooldowns and provenance. Read rectangles directly: clips can span multiple rows.

| Clip | Timed cells | Selected generated drawings |
| --- | ---: | ---: |
| Pace back and forth | 82 | 23 |
| Play with a ball | 16 | 16 |
| Offer the ball | 16 | 16 |
| Play bow | 17 | 17 |
| Chew a stick | 16 | 16 |
| Scratch an ear | 16 | 16 |
| Sleepy yawn | 16 | 16 |
| Sniff around | 16 | 8 |
| Post-nap stretch | 17 | 17 |
| Oops, paw over face | 17 | 17 |
| Cheeky poop | 16 | 16 |
| Mark the rock | 17 | 17 |

Total:262 timed cells;195 selected generated source drawings. Pacing adds18 derived mirrored poses, repeats walking cycles and reverses the five turn drawings. Sniffing uses eight drawings forward/reverse. Timed cells are not unique artwork counts.

`frames/` contains exactly262 final PNG cells; `strips/` contains per-clip strips; `previews/` contains per-clip GIFs and ordered frame sheets, plus all-extras GIF/MP4. `preview.html` plays the exact final atlas, with a128px view and pause/step controls. GIF previews repeat for inspection even when the app manifest requests a one-shot.

Pacing uses continuous interpolation between translateX anchors in the HTML player. The fixed192px-wide native pet window cannot simply apply±160px CSS translation without clipping: Claude must implement bounded roaming/window placement or a suitable overlay area.

All behaviours default disabled in the manifest until app integration; manual preview still shows everything. Toilet gags are explicitly requested playful commands, one-shot, with no persistent trail. Suggested combo: pace once, settle, poop-gag, clear props, return idle. Serious errors retain actionable text and recovery controls.

Verification: all262 cells/counts/margins checked; all12 clips fully stepped and wrapped in standalone browser; native pacing and128px yawn rendering observed. Both ball clips have visible ochre prop pixels in every frame, including the repaired third ball-play pose. These checks do not prove production smoothness. See qa/final-review.json for specific remaining in-between, anatomy, palette and transition work.

Artwork used the built-in image generation tool. Source prompts/notes, selected strips and rejected variants remain one directory above. Deterministic processing used the bundled Pets connected-component extraction helpers (with custom variable counts and a documented trailing-prop grouping override), uniform row scaling/translation, per-frame mirroring and one chroma cleanup pass. No account pet was uploaded or modified.
