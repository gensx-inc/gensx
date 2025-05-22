import { Command } from "commander";
import { render } from "ink";
import React from "react";

import { BuildOptions, BuildWorkflowUI } from "./commands/build.js";
import { DeployOptions, DeployUI } from "./commands/deploy.js";
import { CreateEnvironmentUI } from "./commands/environment/create.js";
import {
  ListEnvironmentOptions,
  ListEnvironmentsUI,
} from "./commands/environment/list.js";
import { SelectEnvironmentUI } from "./commands/environment/select.js";
import { ShowEnvironmentUI } from "./commands/environment/show.js";
import { UnselectEnvironmentUI } from "./commands/environment/unselect.js";
import { LoginUI } from "./commands/login.js";
import { NewCommandOptions, NewProjectUI } from "./commands/new.js";
import { CliOptions, RunWorkflowUI } from "./commands/run.js";
import { StartUI } from "./commands/start.js";
import { VERSION } from "./utils/user-agent.js";

export async function runCLI() {
  const program = new Command()
    .name("gensx")
    .description("CLI tool for GenSX")
    .version(VERSION);

  program
    .command("login")
    .description("Login to GenSX Cloud")
    .action(() => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(React.createElement(LoginUI));
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  program
    .command("new")
    .description("Create a new GenSX project")
    .argument("<project-directory>", "Directory to create the project in")
    .option("-t, --template <type>", "Template to use (ts)")
    .option("-f, --force", "Overwrite existing files", false)
    .option("-s, --skip-login", "Skip login step", false)
    .option("--skip-ide-rules", "Skip IDE rules selection", false)
    .option(
      "--ide-rules <rules>",
      "Comma-separated list of IDE rules to install (cline,windsurf,claude,cursor)",
    )
    .option("-d, --description <desc>", "Optional project description")
    .action((projectPath: string, options: NewCommandOptions) => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(NewProjectUI, {
            projectPath,
            options,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  program
    .command("start")
    .description("Start a local GenSX server")
    .argument("<file>", "File to serve")
    .option("--port <port>", "Port to run the server on", "1337")
    .option("-q, --quiet", "Suppress output", false)
    .action((file: string, options: { port: number; quiet: boolean }) => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(StartUI, {
            file,
            options,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  program
    .command("build")
    .description("Build a GenSX project")
    .argument(
      "<file>",
      "Workflow file to build (e.g. workflow.ts). This should export a gsx.Workflow as the default export.",
    )
    .option("-o, --out-dir <dir>", "Output directory")
    .option("-t, --tsconfig <file>", "TypeScript config file")
    .option("-w, --watch", "Watch for changes", false)
    .option("-q, --quiet", "Suppress output", false)
    .action((file: string, options: BuildOptions) => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(BuildWorkflowUI, {
            file,
            options,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  program
    .command("deploy")
    .description("Deploy a project to GenSX Cloud")
    .argument("<file>", "File to deploy")
    .option(
      "-e, --env-var <VALUE[=value]>",
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
    .option("--env <name>", "Environment name to deploy to")
    .option("-y, --yes", "Automatically answer yes to all prompts", false)
    .action((file: string, options: DeployOptions) => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(DeployUI, {
            file,
            options,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  program
    .command("run")
    .description("Run a workflow")
    .argument("<workflow>", "Workflow name")
    .option("-i, --input <input>", "Input to pass to the workflow", "{}")
    .option("--no-wait", "Do not wait for the workflow to finish")
    .option("-p, --project <name>", "Project name to run the workflow in")
    .option("--env <name>", "Environment name to run the workflow in")
    .option(
      "-o, --output <file>",
      "Output file to write the workflow result to",
      undefined,
    )
    .option("-y, --yes", "Automatically answer yes to all prompts", false)
    .action((workflow: string, options: CliOptions) => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(RunWorkflowUI, {
            workflowName: workflow,
            options,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  // Environment management commands
  const environmentCommand = program
    .command("env")
    .description("Manage GenSX environments")
    .action(async () => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(ShowEnvironmentUI, {
            projectName: undefined,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  environmentCommand
    .command("create")
    .description("Create a new environment")
    .argument("<name>", "Name of the environment")
    .option("-p, --project <name>", "Project name")
    .action(async (name: string, options: { project?: string }) => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(CreateEnvironmentUI, {
            environmentName: name,
            projectName: options.project,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  environmentCommand
    .command("ls")
    .description("List all environments")
    .option("-p, --project <name>", "Project name")
    .action(async (options: ListEnvironmentOptions) => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(ListEnvironmentsUI, {
            projectName: options.project,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  environmentCommand
    .command("select")
    .description("Select an environment as active")
    .argument("<name>", "Name of the environment to select")
    .option("-p, --project <name>", "Project name")
    .action(async (name: string, options: { project?: string }) => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(SelectEnvironmentUI, {
            environmentName: name,
            projectName: options.project,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  environmentCommand
    .command("unselect")
    .description("Unselect an environment")
    .option("-p, --project <name>", "Project name")
    .action(async (options: { project?: string }) => {
      return new Promise<void>((resolve, reject) => {
        const { waitUntilExit } = render(
          React.createElement(UnselectEnvironmentUI, {
            projectName: options.project,
          }),
        );
        waitUntilExit().then(resolve).catch(reject);
      });
    });

  await program.parseAsync();
}

export { NewProjectUI };

export type { NewCommandOptions };
