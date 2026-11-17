# Greg — compatible animation export

This is the fixed Dot v2 layout: 1536×2288 transparent PNG/WebP, 8 columns ×11 rows, 192×208 cells, 73 populated frames. It contains nine animation states and sixteen look directions. Unused cells are transparent.

`dot-animations.json` supplies row indices, frame counts and per-frame milliseconds. `heel-states.png` is the original six-state custom export with 34 populated frames. The newer, denser Heel refinement lives in `../../smooth-v1/`.

Open `preview.html` using the local server, or play the GIF/MP4 files in `previews/`. These assets are not integrated into the Heel app and do not change the active OpenAI Dot.

Executed checks: bundled frame extraction/inspection, exact atlas geometry/transparency/chroma validation, jump lift/landing and look continuity, labeled direction review, three randomized blind axis reviews, Pets structural preflight (`valid: true`), and browser selection/frame-stepping for all six Heel rows and all eleven Dot rows. The exact PNG hash is in `validation-extended.json`.

The compatible layout has only 4–8 frames per action. Its structural validation does not establish that every motion is perceptually smooth. The dense refinement specifically addresses the later request for smoother motion.

Artwork was generated with the built-in image tool from the approved Greg references. Existing Riff assets and earlier variants are preserved.
