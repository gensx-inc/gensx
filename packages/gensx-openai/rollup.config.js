import { createConfigs } from "../../create-rollup-config.js";
import packageJson from "./package.json" with { type: "json" };

const external = [
  ...Object.keys(packageJson.dependencies),
  ...(packageJson.peerDependencies
    ? Object.keys(packageJson.peerDependencies)
    : []),
];

export default createConfigs("src/index.ts", "@gensx/openai", external);
