import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],

  test: {
    // Agent worktrees live under .claude/; without this, main runs every sibling branch's tests too.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. ignore `src-tauri`, and `assets/` (art pipeline writes there; it must not reload the mascot)
      ignored: ["**/src-tauri/**", "**/assets/**", "**/skills/**"],
    },
  },
}));
