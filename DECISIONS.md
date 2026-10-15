# DECISIONS (append-only)

## 2026-10-15 — Desktop shell
Choice: Tauri 2 (Rust shell + React UI + Hono/SQLite sidecar).
Alternatives: Electron reusing apps/greg desktop shell; native SwiftUI/AppKit.
Why: light, native-feeling transparent window; same stack as indx; BongoCat (Apache-2.0) is a working reference.
Reversible? Yes until S1 slice ships. If the 2h spike fails, re-ask.

## 2026-10-15 — AI provider is user-selectable
Choice: Claude subscription (CLI), Codex subscription (CLI), Ollama (local), API key — behind one Provider interface.
Alternatives: single hard-wired Claude API.
Why: user wants choice of subscription/local/other; CLI spawn pattern already proven in apps/greg desktop/electron/ai-providers.mjs.
Reversible? Yes. Unverified: current provider terms for subscription use in a third-party app — check before sharing with anyone.

## 2026-10-15 — Model proposes, app disposes
Choice: providers return text/JSON; sidecar validates with Zod into typed actions and executes per the autonomy ladder.
Why: CLI providers have no tool calling; one action path for all providers; safety boundary lives in app code.
Reversible? Yes.

## 2026-10-15 — Separate product, macOS first
Choice: not part of the Greg nutrition app; macOS only for v0, Windows in v2.
Why: user answer; active-window/Accessibility APIs differ per OS.
Reversible? Yes.

## 2026-10-15 — Interrupt policy
Choice: silent by default, speaks at time-box end or when opened, budget 3/day, one-click Off. Nudges are timers/templates, not LLM calls.
Reversible? Yes (budget number is a setting).
