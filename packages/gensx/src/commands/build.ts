import { existsSync } from "fs";
import { resolve } from "path";

import ora from "ora";
import pc from "picocolors";
import { watch } from "rollup";
import { OutputOptions } from "rollup";

import { bundleWorkflow, getRollupConfig } from "../utils/bundler.js";
import { generateSchema } from "../utils/schema.js";

export interface BuildOptions {
  outDir?: string;
  tsconfig?: string;
  watch?: boolean;
  quiet?: boolean;
}

export async function build(file: string, options: BuildOptions = {}) {
  const quiet = options.quiet ?? false;
  const spinner = ora({ isSilent: quiet });

  try {
    // 1. Validate file exists and is a TypeScript file
    const absolutePath = resolve(process.cwd(), file);
    if (!existsSync(absolutePath)) {
      throw new Error(`File ${file} does not exist`);
    }

    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
      throw new Error("Only TypeScript files (.ts or .tsx) are supported");
    }

    const outDir = options.outDir ?? resolve(process.cwd(), ".gensx", "dist");
    const outFile = resolve(outDir, "handler.js");
    const schemaFile = resolve(outDir, "schema.json");

    if (options.watch) {
      spinner.info("Starting build in watch mode...");

      const rollupConfig = getRollupConfig(absolutePath, outFile, true);
      const watcher = watch(rollupConfig);

      watcher.on("event", async (event) => {
        if (event.code === "START") {
          spinner.start("Building...");
        } else if (event.code === "BUNDLE_END") {
          try {
            await event.result.write(rollupConfig.output as OutputOptions);
            // Generate schema after successful build
            const workflowNames = await generateSchema(
              absolutePath,
              schemaFile,
              options.tsconfig,
            );
            spinner.succeed("Build completed");
            if (!quiet) {
              outputBuildSuccess(workflowNames);
            }
            await event.result.close();
          } catch (error) {
            spinner.fail("Build failed");
            console.error(
              error instanceof Error ? error.message : String(error),
            );
          }
        } else if (event.code === "ERROR") {
          spinner.fail("Build failed");
          const errorMessage =
            event.error instanceof Error
              ? event.error.message
              : JSON.stringify(event.error);
          console.error(errorMessage);
        }
      });

      // Keep the process running in watch mode
      await new Promise<void>((_, reject) => {
        // This promise intentionally never resolves while watching
        const cleanup = () => {
          void watcher.close();
          process.exit(0);
        };

        try {
          process.on("SIGINT", cleanup);
          process.on("SIGTERM", cleanup);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    }

    // Regular build mode
    spinner.start("Bundling handler");
    await bundleWorkflow(absolutePath, outFile, options.watch);
    spinner.succeed();

    spinner.start("Generating schema");
    const workflowNames = await generateSchema(
      absolutePath,
      schemaFile,
      options.tsconfig,
    );
    spinner.succeed();

    if (!quiet) {
      outputBuildSuccess(workflowNames);
    }

    return {
      bundleFile: outFile,
      schemaFile: schemaFile,
    };
  } catch (error) {
    spinner.fail("Build failed");
    throw error;
  }
}

const outputBuildSuccess = (workflowNames: string[]) => {
  console.info(`
${pc.green("✔")} Successfully built project

${pc.bold("Available workflows:")}
${workflowNames.map((name) => pc.cyan("- " + name)).join("\n")}
`);
};
