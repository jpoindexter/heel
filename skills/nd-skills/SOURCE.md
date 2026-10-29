# nd-skills (vendored, unmodified)

Source: https://github.com/jpoindexter/nd-skills
Pinned commit: 8b697d11d864c7db579863f62d7668d201b99da1 (2026-10-29, "Merge pull request #1 from jpoindexter/feat/companion-pack" — companion pack: autism layer, weekly review, interrupt budget, inbox digest)
License: MIT (see LICENSE)

These are the agent's behavior core. Do not edit in place: change them in the nd-skills repo, then re-vendor.
Companion-specific skills (autism layer, weekly review, interrupt budget, inbox digest) live in the nd-skills repo since the v2.2 companion pack (Trello card V1-4).

Only the skills listed in `sidecar/agent/bundled-skills.ts` (the router plus the ones a signal in `prompt.ts` can choose) are ever sent to the model. The rest are vendored so the router's own text can name them and so the set stays whole; `nd-inbox-digest` and `nd-interrupt-budget` in particular are rules Heel enforces in code (the digest prompt in `sidecar/inbox/digest.ts`, the daily budget in the store), not prompt fragments.
