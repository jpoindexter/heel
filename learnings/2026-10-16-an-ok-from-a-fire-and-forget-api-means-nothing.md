# An "ok" from a fire-and-forget API means nothing; get the platform's own answer

**Context:** the system toast returned success in the dev build and showed nothing in the packaged one.

**Insight:** The first library spawned the send on a background task and discarded its error, so my "direct call: ok" proved only that the call was queued. I reported "accepted, no banner seen" and nearly stopped there; the user's "I didn't see it" was the signal that "ok" had been the wrong evidence. The fix was to call the platform API itself, take its completion handler's error as a sentence (UNErrorDomain error 1), and then look at *why*: an ad-hoc linker signature with a made-up identifier and no Info.plist binding makes macOS refuse before any prompt. Re-signing with `codesign --sign -` (now `bundle.macOS.signingIdentity: "-"`) produced the prompt. For anything that talks to the OS on the user's behalf, ship a way to see the OS's answer (a test button, an env hook) before calling it done.

**Apply when:** a feature depends on an OS permission, a notification, an entitlement or a signature.
