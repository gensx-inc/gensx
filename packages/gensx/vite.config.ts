import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { jsxTransformerPlugin } from "./src/vite-jsx-transformer";

export default defineConfig({
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        index: "./src/index.ts",
        "jsx-runtime": "./src/jsx-runtime.ts",
        "jsx-dev-runtime": "./src/jsx-dev-runtime.ts",
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["node:crypto", "fs/promises"],
    },
  },
  plugins: [
    dts({
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    }),
    jsxTransformerPlugin(),
  ],
});
