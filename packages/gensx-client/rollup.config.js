import { createConfigs } from "../../create-rollup-config.js";

const external = ["@gensx/core"];

export default createConfigs(
  ["src/index.ts"],
  "@gensx/client",
  external,
);
