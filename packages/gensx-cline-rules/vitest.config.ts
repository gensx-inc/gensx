import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
    isolate: false,
    silent: "passed-only",
    passWithNoTests: false,
  },
});
