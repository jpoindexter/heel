# Check a secret against its provider before keeping it

An API key field has two tempting shapes: store on Save and find out later, or store and then "Test
connection". Both leave a wrong key in the Keychain and a card that says Ready when it is not.

Heel's shape: Save sends the key to the helper, the helper calls the cheapest read-only endpoint the
provider has (its model list) with that key, and only an answered key is written. A 401 comes back as
one sentence in the field's own help line, with the draft kept, so the person corrects and saves again.
Status then costs no network: a kept key is Ready by construction.

Rule: the check that proves a credential belongs with the write that keeps it, not after it; and the
cheapest read-only call the provider offers is the check.

Also: a docs site that refuses fetches usually has a published OpenAPI spec on GitHub; grep that for
the paths and schemas instead of writing shapes from memory.
