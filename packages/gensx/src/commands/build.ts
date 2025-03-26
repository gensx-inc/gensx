import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import ora from "ora";
import pc from "picocolors";

import { bundleWorkflow } from "../utils/bundler.js";
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

    const outDir = options.outDir ?? resolve(process.cwd(), ".gensx");
    const distDir = resolve(outDir, "dist");
    const schemaFile = resolve(outDir, "schema.json");

    spinner.start("Building workflow using Docker");

    await bundleWorkflow(absolutePath, distDir);

    spinner.succeed();

    // Generate schema locally
    spinner.start("Generating schema");
    const workflowSchemas = generateSchema(absolutePath, options.tsconfig);
    writeFileSync(schemaFile, JSON.stringify(workflowSchemas, null, 2));
    spinner.succeed();

    if (!quiet) {
      outputBuildSuccess();
    }

    return {
      bundleFile: resolve(distDir, "dist.tar.gz"),
      schemaFile: schemaFile,
      schemas: workflowSchemas,
    };
  } catch (error) {
    spinner.fail("Build failed");
    throw error;
  }
}

const outputBuildSuccess = () => {
  console.info(`
${pc.green("✔")} Successfully built project
`);
};
