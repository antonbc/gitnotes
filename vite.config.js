import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [tailwindcss(), sveltekit()],

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
      // 3. ignore Rust and generated/static build output while the desktop app is running
      ignored: ["**/src-tauri/**", "**/build/**", "**/site/dist/**", "**/src-tauri/target/**"],
    },
  },
  build: {
    // GitNotes ships as a local Tauri app, and the editor/preview stack is intentionally
    // richer than a typical public web route. Keep Vite's warning threshold aligned
    // with the known vendor chunk size while still warning on accidental growth.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        /** @param {string} id */
        manualChunks(id) {
          if (id.includes("node_modules/@codemirror") || id.includes("node_modules/@replit/codemirror-vim")) {
            return "editor";
          }

          if (
            id.includes("node_modules/katex") ||
            id.includes("node_modules/markdown-it") ||
            id.includes("node_modules/markdown-it-task-lists")
          ) {
            return "preview";
          }

          if (id.includes("node_modules/fuse.js")) {
            return "search";
          }
        },
      },
    },
  },
}));
