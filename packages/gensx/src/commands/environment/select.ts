import ora from "ora";
import pc from "picocolors";

import { checkProjectExists } from "../../models/projects.js";
import { validateAndSelectEnvironment } from "../../utils/env-config.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface SelectOptions {
  project?: string;
}

export type { SelectOptions };

export async function handleSelectEnvironment(
  name: string,
  options: SelectOptions,
) {
  const spinner = ora();
  const environmentName = name;

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
    `Setting ${pc.cyan(environmentName)} as the active environment for project ${pc.cyan(projectName)}...`,
  );

  try {
    const success = await validateAndSelectEnvironment(
      projectName,
      environmentName,
    );

    if (success) {
      spinner.succeed(
        `Environment ${pc.cyan(environmentName)} is now active for project ${pc.cyan(projectName)}`,
      );
    } else {
      spinner.fail(
        `Environment ${pc.cyan(environmentName)} does not exist in project ${pc.cyan(projectName)}`,
      );
    }
  } catch (error) {
    spinner.fail(`Failed to select environment: ${String(error)}`);
  }
}
