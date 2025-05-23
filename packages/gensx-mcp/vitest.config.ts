// import swc from "unplugin-swc";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "./",
    globals: true,
    isolate: false,
    passWithNoTests: false,
    silent: "passed-only",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    env: loadEnv("test", process.cwd(), ""),
    coverage: {
      provider: "istanbul",
      reporter: ["text-summary", "json-summary", "json"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "tests/**",
        "**/*.d.ts",
      ],
      all: true,
      enabled: true,
      clean: true,
      cleanOnRerun: true,
      reportOnFailure: true,
      skipFull: false,
      extension: [".ts", ".tsx"],
    },
  },
  // TODO: Get swc working to speed things up
  // plugins: [
  //   swc.vite({
  //     module: { type: "es6" },
  //     tsconfigFile: "./tsconfig.json",
  //   }),
  // ],
});
