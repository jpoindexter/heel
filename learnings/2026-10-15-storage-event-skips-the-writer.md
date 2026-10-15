# A `storage` event never fires in the window that wrote the value

**Context:** Verifying Greg's Quiet-mode branch (bubble only, no pacing) by writing `heel:activity = off` into localStorage from Greg's own window through the driver; he kept pacing.
**Dead ends:** Suspected the policy function and the activity hook.
**What worked:** Writing the key from the panel (as Settings does) so the `storage` event reached Greg's window; also writing an unchanged value fires no event anywhere.
**Why:** The spec fires `storage` only in *other* same-origin documents, and only when the value actually changes; the writing window must update its own state itself (the hook does, when its own setter is used).
**Rule:** To test a cross-window setting, change it where the product changes it, never by poking the reader's storage; and clear it first so the write is a real change.
