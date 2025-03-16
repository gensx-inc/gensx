import { Command } from "commander";
export * from "@gensx/core";
// Legacy holdover from v0
export { gsx } from "./gsx.js";
export type { gsx as Gsx } from "./gsx.js";

import packageJson from "../package.json" with { type: "json" };
import { login } from "./commands/login.js";
import { NewCommandOptions, newProject } from "./commands/new.js";

export async function runCLI() {
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
    .option(
      "--skip-ai-assistants",
      "Skip AI assistant integration selection",
      false,
    )
    .option(
      "--ai-assistants <assistants>",
      "Comma-separated list of AI assistants to install (claude,cursor,cline,windsurf)",
    )
    .action(newProject);

  await program.parseAsync();
}

export { newProject };

export type { NewCommandOptions };
