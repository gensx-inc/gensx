
import { Command } from "commander";

import { createGensxProject, CreateOptions } from "./index.js";

export async function runCLI() {
  const program = new Command();

  program
    .name("create-gensx")
    .description("Create a new GenSX project")
    .argument("<project-directory>", "Directory to create the project in")
    .option("-t, --template <name>", "Template to use", "ts")
    .option("-f, --force", "Overwrite existing files", false)
    .action(async (projectPath: string, options: CreateOptions) => {
      try {
        await createGensxProject(projectPath, options);
      } catch (error) {
        console.error("Error:", (error as Error).message);
        process.exit(1);
      }
    });

  await program.parseAsync();
}

runCLI().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
