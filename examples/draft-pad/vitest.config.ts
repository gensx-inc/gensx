import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 60000, // 60 seconds for API calls
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  // Explicitly tell Vite not to load PostCSS config for tests
  css: {
    postcss: {
      plugins: [],
    },
  },
});
