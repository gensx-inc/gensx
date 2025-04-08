import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "jsx-runtime": resolve(__dirname, "src/jsx-runtime.ts"),
        "jsx-dev-runtime": resolve(__dirname, "src/jsx-dev-runtime.ts"),
      },
      name: "@gensx/core",
    },
    rollupOptions: {},
  },
});
