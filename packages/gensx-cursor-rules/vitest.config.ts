import * as path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: path.resolve(__dirname, "./"),
    globals: true,
    isolate: false,
    passWithNoTests: false,
    include: ["./tests/**/*.test.ts"],
  },
});
