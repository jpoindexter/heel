# A `storage` event never reaches the window that wrote the value

Heel keeps some preferences in localStorage and lets Greg's window pick them up through the `storage` event.
That works between windows only: the browser fires `storage` in every *other* document of the origin, never
in the one that called setItem. A hook built on `useState` + a `storage` listener therefore looks right in
Settings (the instance that wrote) and stays stale in every other component of the same window.

The preview showed it at once: Low chosen in Settings, the list behind still five tasks long.

Fix: one module-level value and listener set, `useSyncExternalStore(subscribe, () => current)`; the setter
updates the value, writes localStorage for the other windows, then calls the listeners for this one. The
`storage` listener still feeds `current` for changes from elsewhere.

Rule: a pref read in more than one component of the same window needs a store, not a copied `useState`
hook; the "works in Settings" check is not the check.
