import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { ensureFirstTimeSetupComplete } from "../utils/first-time-setup.js";

export interface DevOptions {
  buildDir?: string;
}

export async function dev(options: DevOptions = {}) {
  await ensureFirstTimeSetupComplete();

  const buildDir = options.buildDir ?? ".gensx/dist";
  const entryPoint = join(buildDir, "index.js");

  if (!existsSync(buildDir)) {
    console.error(`Error: Build directory '${buildDir}' does not exist.`);
    console.error(
      "Please run 'gensx build' first or specify a different build directory with --build-dir",
    );
    process.exit(1);
  }

  if (!existsSync(entryPoint)) {
    console.error(
      `Error: Entry point '${entryPoint}' not found in build directory.`,
    );
    console.error("Please ensure your build contains an index.js file.");
    process.exit(1);
  }

  const denoProcess = spawn(
    "deno",
    ["run", "--allow-all", "--node-modules-dir", entryPoint],
    {
      stdio: "inherit",
    },
  );

  denoProcess.on("error", (err) => {
    console.error("Failed to start Deno process:", err);
    process.exit(1);
  });

  denoProcess.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
