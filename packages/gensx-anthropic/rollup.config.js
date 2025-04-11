import { createConfigs } from "../../create-rollup-config.js";
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

export default createConfigs("src/index.tsx", "@gensx/anthropic", external);
