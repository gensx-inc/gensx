import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 60000, // 60 seconds for API calls
    globals: true,
    environment: "node",
    // Don't process CSS files in tests
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  // Explicitly tell Vite not to load PostCSS
  css: {
    postcss: undefined,
  },
});
