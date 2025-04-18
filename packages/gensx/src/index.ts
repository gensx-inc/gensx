import { Command } from "commander";

import { build, BuildOptions } from "./commands/build.js";
import { deploy } from "./commands/deploy.js";
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
    .option("-p, --project <name>", "Project name")
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
        "-e, --env <VALUE[=value]>",
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
      .action(deploy);

    program
      .command("run")
      .description("Run a workflow")
      .argument("<workflow>", "Workflow name")
      .option("-i, --input <input>", "Input to pass to the workflow")
      .option("--no-wait", "Do not wait for the workflow to finish")
      .option("-p, --project <name>", "Project name to run the workflow in")
      .option(
        "-o, --output <file>",
        "Output file to write the workflow result to",
        undefined,
      )
      .action(runWorkflow);
  }

  await program.parseAsync();
}

export { newProject };

export type { NewCommandOptions };
