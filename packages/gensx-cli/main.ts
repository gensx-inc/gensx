import { runCLI } from "../gensx/dist/index.js";

Deno.env.set("DENO_BINARY", "true");

await runCLI();
Deno.exit(0);
