# Testing Heel

Heel is a desk companion for ADHD and autistic brains: Greg the dog sits on your screen, holds your tasks, reads your mail with you, and runs one focus box at a time. Thank you for trying it.

## Before you install
- A Mac with Apple silicon (M1 or newer). Tested on macOS 26; older versions are untested.
- **Node 22 or newer.** Heel's helper runs on it. With Homebrew: `brew install node`. Check with `node -v`.
- **One AI** Heel can talk to, any of: the Claude app's `claude` command signed in, the `codex` command signed in, Ollama running, or an Anthropic / OpenAI / Mistral API key (Settings › Brain › API keys; it stays in your Keychain).

## Install
1. Download `Heel_<version>_aarch64.dmg` from the latest release and drag Heel to Applications.
2. Open it. If macOS says it can't verify Heel, open **System Settings › Privacy & Security**, scroll down, and click **Open Anyway** (once; until the build is notarized).
3. Greg appears. Click him for the panel. Settings is the gear.

## Tell Jason what happened
**Settings › About › Send feedback.** Pick *Something broke* or *An idea*, write one line and a few sentences, and press **Write the email…**. Heel opens an email to jason@theft.studio in your mail app with the version and logs attached; read it over and press Send. Heel never sends anything by itself.

If a window shows the crash screen, press **Email details** there.

Logs never contain your tasks, messages or mail. You can read exactly what is in them under Settings › About › Debug.

## Your data
Everything stays on your Mac in `~/Library/Application Support/studio.theft.heel`. Settings › Privacy & data backs it up or wipes it. What you type goes to the AI you chose in Settings › Brain; choose Ollama to keep it on your Mac.
