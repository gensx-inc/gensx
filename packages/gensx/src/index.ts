import { Command } from "commander";
export * from "@gensx/core";
// Legacy holdover from v0
export { gsx } from "./gsx.js";
export type { gsx as Gsx } from "./gsx.js";

import packageJson from "../package.json" with { type: "json" };
import { build, BuildOptions } from "./commands/build.js";
import { deploy } from "./commands/deploy.js";
import { dev, DevOptions } from "./commands/dev.js";
import { login } from "./commands/login.js";
import { NewCommandOptions, newProject } from "./commands/new.js";
import { run } from "./commands/run.js";

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
    .option("--skip-ide-rules", "Skip IDE rules selection", false)
    .option(
      "--ide-rules <rules>",
      "Comma-separated list of IDE rules to install (cline,windsurf,claude,cursor)",
    )
    .option("-d, --description <desc>", "Optional project description")
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
    .description("Run a GenSX project in development mode")
    .argument("<file>", "Entry file to run (e.g. src/index.tsx)")
    .option(
      "-b, --build-dir <dir>",
      "Build directory (defaults to .gensx/dist)",
    )
    .option("-w, --watch", "Watch for changes and rebuild automatically", false)
    .action(async (file: string, options: DevOptions) => {
      await dev(file, options);
    });

  program
    .command("deploy")
    .description("Deploy a project to GenSX Cloud")
    .option(
      "-e, --env <VALUE=value>",
      "Environment variable to include with deployment (can be used multiple times)",
      (val, prev: Record<string, string> = {}) => {
        const [key, value] = val.split("=");
        if (!key || !value) {
          throw new Error(
            "Environment variables must be in the format KEY=value",
          );
        }
        return { ...prev, [key]: value };
      },
      {},
    )
    .option("--project <name>", "Project name to deploy to")
    .action(deploy);

  program
    .command("run")
    .description("Run a deployed workflow")
    .argument("<name>", "Name of the deployed workflow")
    .option("-i, --input <json>", "Input to the workflow (JSON string)")
    .option(
      "-f, --input-file <file>",
      "File containing input to the workflow (JSON)",
    )
    .option("-w, --wait", "Wait for the workflow to complete", false)
    .option("-p, --project <name>", "Project name")
    .action(run);

  await program.parseAsync();
}

export { newProject };

export type { NewCommandOptions };
