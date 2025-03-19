import { defineConfig } from "tsup";

import { createTsupConfig } from "../tsup.base.js";

export default defineConfig(createTsupConfig(["src/index.tsx"]));
