import { createConfigs } from "../../create-rollup-config.js";

const external = ["@gensx/client", "react", "react-dom"];

export default createConfigs(
  ["src/index.ts"],
  "@gensx/react",
  external,
);
