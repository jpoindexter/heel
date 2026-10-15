/**
 * Known offenders of the size limits, as `file::name` -> the most lines they may have.
 * This list only shrinks: the test fails when an entry grows, when something new crosses a limit,
 * and when an entry no longer offends (delete it, the debt is paid). Cards in the "UP NEXT" Trello list pay it down.
 */
export const SIZE_ALLOWLIST: Readonly<Record<string, number>> = {
  // M3: split into dock / menus / tray / hit_region / window modules.
  "src-tauri/src/lib.rs::src-tauri/src/lib.rs": 450,
  "src-tauri/src/lib.rs::run": 58,
  // D6: replaced by Radix tokens + small per-feature stylesheets.
  "src/styles.css::src/styles.css": 654,
  // D3-D5: components shrink when they stop hand-rolling controls.
  "src/panel/Panel.tsx::Panel": 65,
  "src/settings/BrainSettings.tsx::BrainSettings": 56,
  "src/today/ChatView.tsx::ChatView": 59,
  "src/today/Compose.tsx::Compose": 63,
  "src/today/Thread.tsx::Thread": 57,
  // Hooks: split state / effects / actions when touched next.
  "src/settings/useBrain.ts::useBrain": 91,
  "src/today/useTasks.ts::useTasks": 89,
  "src/today/useThread.ts::useThread": 85,
  // Server/provider factories.
  "sidecar/agent/providers/ollama.ts::ollamaProvider": 85,
  "sidecar/server/app.ts::createApp": 57,
};
