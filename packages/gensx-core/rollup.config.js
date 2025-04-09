import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

import packageJson from "./package.json" with { type: "json" };

const external = [
  ...Object.keys(packageJson.dependencies),
  ...(packageJson.peerDependencies
    ? Object.keys(packageJson.peerDependencies)
    : []),
];

// Custom plugin to emit package.json files
const emitModulePackageJson = () => ({
  name: "emit-module-package-json",
  generateBundle(options) {
    const packageJson = {
      type: options.format === "es" ? "module" : "commonjs",
    };

    this.emitFile({
      type: "asset",
      fileName: "package.json",
      source: JSON.stringify(packageJson, null, 2),
    });
  },
});

const createConfig = (format) => ({
  input: ["src/index.ts", "src/jsx-runtime.ts", "src/jsx-dev-runtime.ts"],
  output: {
    format,
    dir: `dist/${format === "es" ? "esm" : "cjs"}`,
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: "src",
    chunkFileNames: `[name].${format === "es" ? "js" : "cjs"}`,
    sourcemapPathTransform: (relativeSourcePath) => {
      // Transform source paths to be relative to the package root
      return `@gensx/core/${relativeSourcePath}`;
    },
    intro: `/**
* Check out the docs at https://www.gensx.com/docs
* Find us on Github https://github.com/gensx-inc/gensx
* Find us on Discord https://discord.gg/F5BSU8Kc
*/`,
  },
  external,
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ["node"],
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.build.json",
      sourceMap: true,
      noEmitOnError: true,
      outDir: `dist/${format === "es" ? "esm" : "cjs"}`,
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        sourceRoot: "../../../src",
      },
    }),
    emitModulePackageJson(),
  ],
});

export default [createConfig("es"), createConfig("cjs")];
