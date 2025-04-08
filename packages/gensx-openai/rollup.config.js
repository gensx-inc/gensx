import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const entries = {
  index: "src/index.tsx",
};

const external = [/node_modules/];

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

const createConfig = (entry, entryName, format) => ({
  input: entry,
  output: {
    file: `dist/${format === "es" ? "esm" : "cjs"}/${entryName}.${format === "es" ? "js" : "cjs"}`,
    format,
    sourcemap: true,
    sourcemapPathTransform: (relativeSourcePath) => {
      // Transform source paths to be relative to the package root
      return `@gensx/openai/${relativeSourcePath}`;
    },
  },
  external,
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.build.json",
      sourceMap: true,
      noEmitOnError: true,
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        sourceRoot: "../../src",
      },
    }),
    emitModulePackageJson(),
  ],
});

export default Object.entries(entries).flatMap(([entryName, entry]) => [
  createConfig(entry, entryName, "es"),
  createConfig(entry, entryName, "cjs"),
]);
