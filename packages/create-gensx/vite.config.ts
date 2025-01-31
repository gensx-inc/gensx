import { resolve } from "path";

import fs from "fs-extra";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig(({ command }) => ({
  build: {
    sourcemap: true,
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        cli: resolve(__dirname, "src/cli.ts"),
      },
      formats: ["es"],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: (id) => !id.startsWith(".") && !id.startsWith("/"),
    },
    watch: command === "serve" ? {} : undefined,
  },
  plugins: [
    dts({
      outDir: "dist",
      rollupTypes: true,
      afterDiagnostic: (diagnostics) => {
        if (diagnostics.length) {
          throw new Error("Compile failure");
        }
      },
    }),
    {
      name: "copy-templates",
      // copy templates to dist on build start for the pnpm dev case
      async buildStart() {
        await fs.copy(resolve(__dirname, "src/templates"), "dist/templates");
      },
      // copy templates to dist on build end for the pnpm build case
      async closeBundle() {
        await fs.copy(resolve(__dirname, "src/templates"), "dist/templates");
      },
    },
  ],
}));
