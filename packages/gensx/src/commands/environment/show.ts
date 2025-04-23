import ora from "ora";
import pc from "picocolors";

import { checkProjectExists } from "../../models/projects.js";
import { getSelectedEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface ShowOptions {
  project?: string;
}

export type { ShowOptions };

export async function handleShowEnvironment(options: ShowOptions) {
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

  // Check if the project exists
  const projectExists = await checkProjectExists(projectName);
  if (!projectExists) {
    spinner.fail(`Project ${pc.cyan(projectName)} does not exist`);
    return;
  }

  spinner.start(
    `Getting active environment for project ${pc.cyan(projectName)}...`,
  );

  try {
    const selectedEnvironment = await getSelectedEnvironment(projectName);

    if (selectedEnvironment) {
      spinner.succeed(
        `Active environment for project ${pc.cyan(projectName)} is ${pc.green(selectedEnvironment)}`,
      );
    } else {
      spinner.info(
        `No active environment set for project ${pc.cyan(projectName)}`,
      );
    }
  } catch (error) {
    spinner.fail(`Failed to get active environment: ${String(error)}`);
  }
}
