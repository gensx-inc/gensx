import { defineConfig } from "tsup";

export default defineConfig([
  // ESM Build
  {
    entry: {
      index: "src/index.ts",
      cli: "src/cli.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist/esm",
    esbuildOptions(options) {
      options.conditions = ["module", "import"];
      options.platform = "node";
      options.keepNames = true;
    },
  },
  // CJS Build
  {
    entry: {
      index: "src/index.ts",
      cli: "src/cli.ts",
    },
    format: ["cjs"],
    sourcemap: true,
    outDir: "dist/cjs",
    esbuildOptions(options) {
      options.conditions = ["require"];
      options.platform = "node";
      options.keepNames = true;
    },
    // Handle ESM dependencies properly
    noExternal: ["serialize-error"],
    // Bundle mode to properly include ESM dependencies
    treeshake: true,
  },
  // Type definitions (only need to generate once)
  {
    entry: {
      index: "src/index.ts",
      cli: "src/cli.ts",
    },
    format: ["esm"],
    dts: {
      only: true,
    },
    sourcemap: true,
    outDir: "dist",
    clean: false,
  },
]);
