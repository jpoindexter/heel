# A second browser preview beside the live app: own port, own data dir, own origin, harness-run

**Context:** N21 (five methods) had to be verified in a real panel while another session owned the Tauri dev stack on port 1420 and the real data dir.

**What failed first:** vite on another port could not reach a throwaway helper: the helper's CORS list only knew `http://localhost:1420`. A helper started as `nohup … &` inside a one-shot shell died a minute later; a vite preview died during a `pkill -f` sweep aimed at the helper.

**What worked:**
- `HEEL_DATA_DIR=<scratch>` for the helper (already existed) and a new `HEEL_DEV_ORIGIN=http://localhost:1430` that the helper's entry adds to its allowed origins; the panel at `?window=panel&sidecar=PORT:TOKEN` with the port and token read from the scratch dir's `sidecar.json`.
- Start the helper as a harness background task (`run_in_background`), never `nohup … &` from a one-shot shell. Restart it after every change to `shared/` or `sidecar/`: tsx does not reload.
- Stop a helper by the port it listens on (`lsof -t -iTCP:PORT`), not by a `pkill -f` pattern that can hit the preview.
- A 5-second Undo toast: press Undo by coordinate in the same batch as the tap that raised it (a `find` between them is too slow).

**Rule:** a parallel verification stack is four things — port, data dir, origin, lifetime — and each one must be its own, or you are driving someone else's app.
