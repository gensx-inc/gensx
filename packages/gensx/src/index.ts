import { Command } from "commander";

import { build, BuildOptions } from "./commands/build.js";
import { deploy } from "./commands/deploy.js";
import { handleCreateEnvironment } from "./commands/environment/create.js";
import { handleListEnvironments } from "./commands/environment/list.js";
import { handleSelectEnvironment } from "./commands/environment/select.js";
import { handleShowEnvironment } from "./commands/environment/show.js";
import { handleUnselectEnvironment } from "./commands/environment/unselect.js";
import { login } from "./commands/login.js";
import { NewCommandOptions, newProject } from "./commands/new.js";
import { runWorkflow } from "./commands/run.js";
import { start } from "./commands/start.js";
import { getAuth } from "./utils/config.js";
import { VERSION } from "./utils/user-agent.js";

export async function runCLI() {
  const program = new Command()
    .name("gensx")
    .description("CLI tool for GenSX")
    .version(VERSION);

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
    .option("--skip-ide-rules", "Skip IDE rules selection", false)
    .option(
      "--ide-rules <rules>",
      "Comma-separated list of IDE rules to install (cline,windsurf,claude,cursor)",
    )
    .option("-d, --description <desc>", "Optional project description")
    .action(newProject);

  program
    .command("start")
    .description("Start a local GenSX server")
    .argument("<file>", "File to serve")
    .option("--port <port>", "Port to run the server on", "1337")
    .option("-q, --quiet", "Suppress output", false)
    .action(start);

  const auth = await getAuth();

  // Only show Workflow execution commands to Gensx users for now.
  if (auth && auth.org === "gensx") {
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
        console.info(`Workflow built to ${outFile.bundleFile}`);
      });

    program
      .command("deploy")
      .description("Deploy a project to GenSX Cloud")
      .argument("<file>", "File to deploy")
      .option(
        "-ev, --env-var <VALUE[=value]>",
        "Environment variable to include with deployment (can be used multiple times)",
        (val, prev: Record<string, string> = {}) => {
          let [key, value] = val.split("=") as [string, string | undefined];
          if (!key) {
            throw new Error(
              "Environment variables must be in the format KEY=value",
            );
          }
          value ??= process.env[key];
          if (value === undefined) {
            throw new Error(`Environment variable ${key} has no value.`);
          }
          return { ...prev, [key]: value };
        },
        {},
      )
      .option("-p, --project <name>", "Project name to deploy to")
      .option("-e, --env <name>", "Environment name to deploy to")
      .action(deploy);

    program
      .command("run")
      .description("Run a workflow")
      .argument("<workflow>", "Workflow name")
      .option("-i, --input <input>", "Input to pass to the workflow")
      .option("--no-wait", "Do not wait for the workflow to finish")
      .option("-p, --project <name>", "Project name to run the workflow in")
      .option("-e, --env <name>", "Environment name to run the workflow in")
      .option(
        "-o, --output <file>",
        "Output file to write the workflow result to",
        undefined,
      )
      .action(runWorkflow);

    // Environment management commands
    const environmentCommand = program
      .command("env")
      .description("Manage GenSX environments")
      .action(handleShowEnvironment);

    environmentCommand
      .command("create")
      .description("Create a new environment")
      .argument("<name>", "Name of the environment")
      .option("-p, --project <name>", "Project name")
      .action(handleCreateEnvironment);

    environmentCommand
      .command("ls")
      .description("List all environments")
      .option("-p, --project <name>", "Project name")
      .action(handleListEnvironments);

    environmentCommand
      .command("select")
      .description("Select an environment as active")
      .argument("<name>", "Name of the environment to select")
      .option("-p, --project <name>", "Project name")
      .action(handleSelectEnvironment);

    environmentCommand
      .command("unselect")
      .description("Unselect an environment")
      .option("-p, --project <name>", "Project name")
      .action(handleUnselectEnvironment);
  }

  await program.parseAsync();
}

export { newProject };

export type { NewCommandOptions };
