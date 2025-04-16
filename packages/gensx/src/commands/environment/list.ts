import ora from "ora";
import pc from "picocolors";

import { listEnvironments } from "../../models/environment.js";
import { checkProjectExists } from "../../models/projects.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface ListOptions {
  project?: string;
}

export async function handleListEnvironments(options: ListOptions) {
  const spinner = ora();

  let projectName = options.project;
  if (!projectName) {
    const projectConfig = await readProjectConfig(process.cwd());
    if (projectConfig?.projectName) {
      projectName = projectConfig.projectName;
      spinner.info(
        `Using project name from gensx.yaml: ${pc.cyan(projectName)}`,
      );
    } else {
      spinner.fail("No project name provided");
      throw new Error(
        "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
      );
    }
  }

  const projectExists = await checkProjectExists(projectName);
  if (!projectExists) {
    spinner.fail(`Project ${projectName} does not exist`);
    return;
  }

  spinner.start("Fetching environments...");
  const environments = await listEnvironments(projectName);

  spinner.succeed(
    `Found ${environments.length} environments for project ${pc.cyan(
      projectName,
    )}`,
  );

  if (environments.length === 0) {
    return;
  }

  // Print table header
  console.info(
    "\n",
    pc.bold(
      `${pc.cyan("NAME").padEnd(30)} ${pc.cyan("UPDATED AT").padEnd(24)}`,
    ),
  );

  // Print each environment
  environments.forEach((env) => {
    const updatedAt = new Date(env.updatedAt).toLocaleString();

    console.info(`${pc.green(env.name).padEnd(30)} ${updatedAt.padEnd(24)}`);
  });
}
