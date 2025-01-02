// import swc from "unplugin-swc";
import * as path from "path";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

import tsconfig from "./tsconfig.json";

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
    root: "./",
    globals: true,
    isolate: false,
    passWithNoTests: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    env: loadEnv("test", process.cwd(), ""),
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts", "src/**/*.tsx"],
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
