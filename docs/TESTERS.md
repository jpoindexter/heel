# Testing Heel

Heel is a desk companion for ADHD and autistic brains: Greg the dog sits on your screen, holds your tasks, reads your mail with you, and runs one focus box at a time. Thank you for trying it.

## Before you install
- A Mac with Apple silicon (M1 or newer). Tested on macOS 26; older versions are untested.
- **Node 22 or newer.** Heel's helper runs on it. With Homebrew: `brew install node`. Check with `node -v`.
- **One AI** Heel can talk to, any of: the Claude app's `claude` command signed in, the `codex` command signed in, Ollama running, or an Anthropic / OpenAI / Mistral API key (Settings › Brain › API keys; it stays in your Keychain).
- For job applications: installed Chrome, Brave or Edge. Screenshot assistance needs a vision-capable AI; live testing used Codex.

## Install
1. Download `Heel_<version>_aarch64.dmg` from the latest release and drag Heel to Applications.
2. Open Heel. The [v0.1.3 tester build](https://github.com/jpoindexter/heel/releases/tag/v0.1.3) is Developer ID–signed and notarized by Apple.
3. Greg appears. Click him for the panel. Settings is the gear.
4. **Settings › Help** (the first group) explains every part in short steps.

## Tell Jason what happened
**Settings › About › Send feedback.** Pick *Something broke* or *An idea*, write one line and a few sentences, and press **Write the email…**. Heel opens an email to jason@theft.studio in your mail app with the version and logs attached; read it over and press Send. Heel never sends anything by itself.

If a window shows the crash screen, press **Email details** there.

Logs never contain your tasks, messages or mail. You can read exactly what is in them under Settings › About › Debug.

## Your data
Heel stores its data on your Mac in `~/Library/Application Support/studio.theft.heel`. Settings › Privacy & data backs it up or wipes it. What you type goes to the AI you chose in Settings › Brain; choose Ollama to process it locally.

## Job applications in 0.1.3
Open **Job applications** on Today, or ask Heel to prepare an application with its URL. Supply your facts/CV, fill and correct the form, then review and approve each outgoing site request with **Allow once**. Approval sends the displayed request and any attached document to that site. Filling sends facts/page content to your selected AI, including a screenshot when needed. Heel uses a separate browser profile; sign in or complete human verification in its visible browser yourself.

Read the [application guide](APPLICATIONS.md) for supported controls and limits. PDF/DOC/DOCX/TXT attachments are supported; extracting PDF text currently needs Apple's command line tools, so paste facts if those are unavailable. An uncertain submission must be checked at the site before trying again. This release was exercised end to end in the native app against synthetic applications, including the macOS CV picker and approval boundaries. It has not been tested on every ATS or on another Mac.

## Previously reported findings (not rechecked for 0.1.3)
- The keyboard focus outline is missing from Help topics, although Tab and Space/Enter operate them.
- Send feedback uses your Mac’s configured email-link handler. If that handler is a browser without a working email service, Heel may report that an email is open even though no draft appeared.
