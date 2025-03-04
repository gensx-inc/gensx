import { Command } from "commander";

import packageJson from "../package.json" with { type: "json" };
import { build, BuildOptions } from "./commands/build.js";
import { deploy } from "./commands/deploy.js";
import { dev, DevOptions } from "./commands/dev.js";
import { login } from "./commands/login.js";
import { newProject } from "./commands/new.js";

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

  program
    .command("build")
    .description("Build a GenSX project")
    .argument(
      "<file>",
      "Workflow file to build (e.g. workflow.ts). This should export a gsx.Workflow as the default export.",
    )
    .option("-o, --out-dir <dir>", "Output directory")
    .option("-t, --tsconfig <file>", "TypeScript config file")
    .action(async (file: string, options: BuildOptions) => {
      const outFile = await build(file, options);
      console.info(`Workflow built to ${outFile}`);
    });

  program
    .command("dev")
    .description("Run the built GenSX project")
    .option(
      "-b, --build-dir <dir>",
      "Build directory (defaults to .gensx/dist)",
    )
    .action(async (options: DevOptions) => {
      await dev(options);
    });

  program
    .command("deploy")
    .description("Deploy a handler to GenSX Cloud")
    .argument("<file>", "Handler file to deploy (e.g. handler.ts)")
    .option("-n, --name <name>", "Deployment name")
    .option("-p, --prod", "Deploy to production", false)
    .option("-e, --env <file>", "Environment variables file")
    .action(deploy);

  program.parse();
}
