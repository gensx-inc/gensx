// import swc from "unplugin-swc";
import * as path from "path";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

import tsconfig from "./tsconfig.json" with { type: "json" };

// Create an alias object from the paths in tsconfig.json
const alias = Object.fromEntries(
  // For Each Path in tsconfig.json
  Object.entries(tsconfig.compilerOptions.paths).map(([key, [value]]) => [
    // Remove the "/*" from the key and resolve the path
    key.replace("/*", ""),
    // Remove the "/*" from the value Resolve the relative path
    path.resolve(__dirname, value.replace("/*", "")),
  ]),
);

export default defineConfig({
  resolve: {
    alias,
  },
  test: {
    root: path.resolve(__dirname, "./"),
    globals: true,
    isolate: false,
    passWithNoTests: false,
    silent: "passed-only",
    include: ["./tests/**/*.test.ts", "./tests/**/*.test.tsx"],
    env: loadEnv("test", process.cwd(), ""),
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
