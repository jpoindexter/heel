# Greg — Heel animation pack

Open `preview.html` to play the sheets and inspect individual frames. It includes a 128px view, pause/step controls, and a dark backdrop. The player starts paused when the system requests reduced motion.

`heel-smooth.png` / `.webp`: transparent 3072×1248 custom sheet; 16 columns ×6 rows; each frame is 192×208. Rows: idle, listening, focus, gentle nudge, done, rest. There are 96 timed frames. `heel-animations.json` contains exact millisecond timings. First/last-frame holds are intentional; playback is quiet, with brief gestures rather than continuous activity.

`strips/` contains a transparent sheet per state. `frames/` contains individual PNG frames. `previews/` contains labeled GIFs and the all-state MP4. `contact-sheet.png` shows every frame.

`compatible-dot/` preserves the separate, validated Dot v2 export: 1536×2288, 8 columns ×11 rows, 73 populated frames, nine actions plus sixteen look directions. Its fixed 4–8-frame action layout differs from the denser Heel sheet. Use its own JSON, not the Heel geometry.

The coat was flattened to a consistent charcoal palette to reduce painted-texture flicker. Greg keeps the approved head, ears, dark muzzle/nose, and white chin/chest markings. The tail wag intentionally uses eight generated outward poses in reverse for the return: eight unique drawings and sixteen playback frames, with stable body pixels. Other calm rows use sixteen generated frames. No cross-fading, optical-flow limbs, or repeated frames added merely to inflate density.

These are asset exports and a standalone player. Heel app integration, production performance and subjective acceptance on the user's desktop are separate. The sources, rejected attempts, authoring records and QA reports are retained one directory above. Rejected dense gait experiments are not part of this production calm sheet; the compatible export retains its previously checked gait.

Artwork generated with the built-in image tool. Frame extraction, registration, chroma cleanup and packing transform generated pixels without redrawing Greg. Riff and earlier variants remain intact.

Verification: all 96 cells passed count/clipping checks. In the standalone player each of the six rows was stepped through all sixteen frames and wrapped back to frame one. Timed Done and Focus playback and native/128px rendering were observed. Small drawn outline variation remains; Focus has a slightly warmer grey than Idle. State changes are direct switches, without authored transition clips. See `qa/final-review.json` in the archive for exact scope.
