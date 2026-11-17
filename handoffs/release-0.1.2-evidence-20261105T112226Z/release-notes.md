Tester build of Heel, a desk companion for ADHD and autistic brains: Greg the dog holds your tasks, reads your mail with you, and runs one focus box at a time.

**Read [docs/TESTERS.md](https://github.com/jpoindexter/heel/blob/main/docs/TESTERS.md) before installing.**

## Before you install
- Apple silicon Mac (tested on macOS 26).
- **Node 22 or newer** (`brew install node`).
- One AI: `claude` or `codex` signed in, Ollama running, or an Anthropic / OpenAI / Mistral API key.

## Opening it
Signed and notarized by Apple: opens like any app.

## Help and feedback
**Settings › Help** explains every part in short steps. Settings › About › **Send feedback** opens an email to jason@theft.studio with the version and logs (never your tasks, messages or mail). The crash screen has **Email details**.

SHA-256 of the DMG: `f6026c77a0ce2c36ed8adcab4b3a295fb4c6f361891b267e6b62bce9127ab976`

## Known findings from native checks
- Help topics and their keyboard activation work in light and dark; the keyboard focus outline is missing and needs a follow-up fix.
- Feedback relies on the Mac’s configured mailto handler. On the test Mac, Brave accepted the link without opening a draft, although Heel reported success. A configured email client is required; draft opening is not verified for this configuration.
