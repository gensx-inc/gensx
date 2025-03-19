import { defineConfig } from "tsup";

export default defineConfig([
  // ESM Build
  {
    entry: {
      index: "src/index.ts",
      run: "src/run.ts",
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
    async onSuccess() {
      const { cp } = await import("node:fs/promises");
      await cp("src/templates", "dist/templates", { recursive: true });
    },
  }
]);
