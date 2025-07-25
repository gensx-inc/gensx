#!/usr/bin/env node

import { Command } from "commander";

import { createGensxProject, NewCommandOptions } from "./index.js";

export async function runCLI() {
  const program = new Command();

  program
    .name("create-gensx")
    .description("Create a new GenSX project")
    .argument("<project-directory>", "Directory to create the project in")
    .option("-t, --template <type>", "Template to use (typescript, next)")
    .option("-f, --force", "Overwrite existing files", false)
    .option("-s, --skip-login", "Skip login step", false)
    .option("--skip-ide-rules", "Skip IDE rules selection", false)
    .option(
      "--ide-rules <rules>",
      "Comma-separated list of IDE rules to install (cline,windsurf,claude,cursor)",
    )
    .option("-d, --description <desc>", "Optional project description")
    .action(async (projectPath: string, options: NewCommandOptions) => {
      try {
        await createGensxProject(projectPath, options);
      } catch (error) {
        console.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

runCLI().catch((error: unknown) => {
  console.error("Error:", (error as Error).message);
  process.exit(1);
});
