import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: "node",
    css: false,
    alias: {
      // Treat CSS imports as empty modules so katex CSS doesn't break tests
      "katex/dist/katex.min.css": "/dev/null"
    }
  }
});
