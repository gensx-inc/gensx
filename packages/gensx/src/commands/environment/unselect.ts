import ora from "ora";
import pc from "picocolors";

import { checkProjectExists } from "../../models/projects.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface UnselectOptions {
  project?: string;
}

export type { UnselectOptions };

export async function handleUnselectEnvironment(options: UnselectOptions) {
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
    `Clearing active environment for project ${pc.cyan(projectName)}...`,
  );

  try {
    await validateAndSelectEnvironment(projectName, null);
    spinner.succeed(
      `Active environment cleared for project ${pc.cyan(projectName)}`,
    );
  } catch (error) {
    spinner.fail(`Failed to clear environment: ${String(error)}`);
  }
}
