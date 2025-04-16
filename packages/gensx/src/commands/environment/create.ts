import enquirer from "enquirer";
import ora from "ora";
import pc from "picocolors";

import { createEnvironment } from "../../models/environment.js";
import { checkProjectExists, createProject } from "../../models/projects.js";
import { PromptModule } from "../../types/prompt.js";
import { readProjectConfig } from "../../utils/project-config.js";

interface CreateOptions {
  project?: string;
}

export async function handleCreateEnvironment(
  name: string,
  options: CreateOptions,
) {
  const environmentName = name;
  let environmentCreated = false;
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
    spinner.stop();
    const prompter = enquirer as PromptModule;
    const shouldCreateProject = await prompter
      .prompt<{ confirm: boolean }>({
        type: "confirm",
        name: "confirm",
        message: `Project ${pc.cyan(projectName)} does not exist. Would you like to create it?`,
        initial: true,
      })
      .then((result) => result.confirm)
      .catch(() => false);

    if (shouldCreateProject) {
      spinner.start("Creating project and environment...");
      await createProject(projectName, environmentName);
      spinner.succeed(
        `Project ${pc.cyan(projectName)} and environment ${pc.cyan(
          environmentName,
        )} created`,
      );
      environmentCreated = true;
    } else {
      spinner.fail(`Cannot create environment without a project`);
      return;
    }
  }

  if (!environmentCreated) {
    spinner.start("Creating environment...");
    try {
      await createEnvironment(projectName, environmentName);
      spinner.succeed(
        `Environment ${pc.cyan(name)} created for project ${pc.cyan(
          projectName,
        )}`,
      );
    } catch (error) {
      spinner.fail(`Failed to create environment: ${String(error)}`);
    }
  }
}
