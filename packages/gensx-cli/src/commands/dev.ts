import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { build } from "./build.js";

export interface DevOptions {
  buildDir?: string;
  watch?: boolean;
}

export async function dev(entryFile: string, options: DevOptions = {}) {
  const buildDir = options.buildDir ?? ".gensx/dist";
  const entryPoint = join(buildDir, "index.js");
  const absoluteEntryPath = resolve(process.cwd(), entryFile);

  if (!existsSync(absoluteEntryPath)) {
    console.error(`Error: Entry file '${entryFile}' does not exist.`);
    process.exit(1);
  }

  if (!entryFile.endsWith(".ts") && !entryFile.endsWith(".tsx")) {
    console.error("Error: Only TypeScript files (.ts or .tsx) are supported");
    process.exit(1);
  }

  // Run the initial build
  await build(entryFile, {
    outDir: buildDir,
    watch: false,
    quiet: true,
  });

  // Start the Deno process
  const denoProcess = spawn(
    "deno",
    ["run", "--allow-all", "--node-modules-dir", "--watch", entryPoint],
    {
      stdio: "ignore",
    },
  );

  denoProcess.on("error", (err) => {
    console.error("Failed to start Deno process:", err);
    process.exit(1);
  });

  // If watch mode is enabled, start the build watcher in parallel
  if (options.watch) {
    void build(entryFile, {
      outDir: buildDir,
      watch: true,
    }).catch((error: unknown) => {
      console.error("Build watcher failed:", error);
      denoProcess.kill();
      process.exit(1);
    });
  }

  // Handle process exit
  denoProcess.on("exit", (code) => {
    if (!options.watch) {
      process.exit(code ?? 0);
    }
  });

  // Handle interrupts
  process.on("SIGINT", () => {
    denoProcess.kill();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    denoProcess.kill();
    process.exit(0);
  });
}
