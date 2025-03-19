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
    outDir: "dist",
    esbuildOptions(options) {
      options.conditions = ["module", "import"];
      options.platform = "node";
      options.keepNames = true;
    },
  }
]);
