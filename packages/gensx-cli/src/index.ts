import { Command } from "commander";

import { version } from "../package.json";
import { login } from "./commands/login";
import { newProject } from "./commands/new";

export function runCLI() {
  const program = new Command()
    .name("gensx")
    .description("CLI tool for GenSX")
    .version(version);

  program.command("login").description("Login to GenSX Cloud").action(login);

  program
    .command("new")
    .description("Create a new GenSX project")
    .argument("<project-directory>", "Directory to create the project in")
    .option("-t, --template <type>", "Template to use (ts)")
    .option("-f, --force", "Overwrite existing files", false)
    .action(newProject);

  program.parse();
}
