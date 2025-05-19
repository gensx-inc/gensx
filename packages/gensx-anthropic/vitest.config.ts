// import swc from "unplugin-swc";
import * as path from "path";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: path.resolve(__dirname, "./"),
    globals: true,
    isolate: false,
    passWithNoTests: false,
    include: ["./tests/**/*.test.ts", "./tests/**/*.test.tsx"],
    env: loadEnv("test", process.cwd(), ""),
    silent: "passed-only",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text-summary", "json-summary", "json"],
      reportsDirectory: "coverage",
      include: ["./src/**/*.ts", "./src/**/*.tsx"],
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
