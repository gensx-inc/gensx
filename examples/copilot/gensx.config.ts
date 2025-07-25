import { createGenSXConfig } from "@gensx/nextjs";
import * as workflows from "./gensx/workflows";

export default createGenSXConfig({
  workflows,
});