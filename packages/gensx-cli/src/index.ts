import { Command } from "commander";

import packageJson from "../package.json" with { type: "json" };
import { login } from "./commands/login.js";
import { NewCommandOptions, newProject } from "./commands/new.js";

export function runCLI() {
  const program = new Command()
    .name("gensx")
    .description("CLI tool for GenSX")
    .version(packageJson.version);

  program
    .command("login")
    .description("Login to GenSX Cloud")
    .action(async () => {
      await login();
    });

  program
    .command("new")
    .description("Create a new GenSX project")
    .argument("<project-directory>", "Directory to create the project in")
    .option("-t, --template <type>", "Template to use (ts)")
    .option("-f, --force", "Overwrite existing files", false)
    .action(newProject);

  program.parse();
}

export { newProject };

export type { NewCommandOptions };
