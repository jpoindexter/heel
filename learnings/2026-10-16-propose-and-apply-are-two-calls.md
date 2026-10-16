# Propose and apply are two calls

**Context:** N23 — the AI splits a task; the person confirms before anything is written.

**Insight:** When the model's output is a *proposal*, give it its own endpoint that returns data and writes nothing, with a prompt that asks for exactly that shape, and let the UI own the pause. The apply call then takes the person's edited list, not the model's. This keeps "model proposes, app disposes" literal: the model never has a write path, and Undo is one row-level call. Also: Hono matches routes in registration order; a parametric route like `/tasks/:id/:action` swallows later `/tasks/:id/split` unless the specific route is registered first.

**Apply when:** an AI feature ends in a write the person must approve.
