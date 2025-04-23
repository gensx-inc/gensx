import type { Ora } from "ora";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import enquirer from "enquirer";
import ora from "ora";
import pc from "picocolors";

import {
  checkEnvironmentExists,
  createEnvironment,
  listEnvironments,
} from "../models/environment.js";
import { checkProjectExists, createProject } from "../models/projects.js";
import { PromptModule } from "../types/prompt.js";
import { getConfigPaths } from "./config.js";

interface ProjectEnvironmentConfig {
  selectedEnvironment?: string;
  lastUsed?: string; // ISO date string
}

/**
 * Gets the directory where project-specific configs are stored
 */
async function getProjectsConfigDir(): Promise<string> {
  const { configDir } = getConfigPaths();
  const projectsDir = path.join(configDir, "projects");

  // Ensure the directory exists
  await mkdir(projectsDir, { recursive: true });

  return projectsDir;
}

/**
 * Get the path to a project's environment config file
 */
async function getProjectsConfigPath(projectName: string): Promise<string> {
  const projectsDir = await getProjectsConfigDir();
  return path.join(projectsDir, `${projectName}.json`);
}

/**
 * Get the selected environment for a project
 */
export async function getSelectedEnvironment(
  projectName: string,
): Promise<string | null> {
  try {
    const configPath = await getProjectsConfigPath(projectName);
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content) as ProjectEnvironmentConfig;
    return config.selectedEnvironment ?? null;
  } catch {
    return null;
  }
}

/**
 * Select an environment for a project
 */
export async function selectEnvironment(
  projectName: string,
  environmentName: string | null,
): Promise<void> {
  const configPath = await getProjectsConfigPath(projectName);

  let config: ProjectEnvironmentConfig = {};

  // Try to read existing config
  try {
    const content = await readFile(configPath, "utf-8");
    config = JSON.parse(content) as ProjectEnvironmentConfig;
  } catch {
    // File doesn't exist or is invalid, use empty config
  }

  // Update config
  if (environmentName === null) {
    // Unselect environment
    delete config.selectedEnvironment;
  } else {
    config.selectedEnvironment = environmentName;
  }

  config.lastUsed = new Date().toISOString();

  // Write updated config
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Verify that the environment exists before selecting it
 */
export async function validateAndSelectEnvironment(
  projectName: string,
  environmentName: string | null,
): Promise<boolean> {
  // If we're unsetting the environment, no validation needed
  if (environmentName === null) {
    await selectEnvironment(projectName, null);
    return true;
  }

  // Check if the environment exists
  try {
    const exists = await checkEnvironmentExists(projectName, environmentName);
    if (!exists) {
      return false;
    }

    await selectEnvironment(projectName, environmentName);
    return true;
  } catch (error) {
    throw new Error(`Failed to validate environment: ${String(error)}`);
  }
}

/**
 * Get the environment to use for deployment or execution, with interactive prompts
 * allowing the user to select or create an environment
 */
export async function getEnvironmentForOperation(
  projectName: string,
  specifiedEnvironment?: string,
  existingSpinner?: Ora,
  allowCreate = true,
): Promise<string> {
  // Use the provided spinner or create a new one if not provided
  // Setting discardStdin: false prevents the spinner from interfering with stdin and causing hangs
  const spinner = existingSpinner ?? ora({ discardStdin: false });

  // If environment is explicitly specified, use it
  if (specifiedEnvironment) {
    return specifiedEnvironment;
  }

  // Check if project exists
  const projectExists = await checkProjectExists(projectName);

  // Try to get the selected environment
  const selectedEnvironment = await getSelectedEnvironment(projectName);

  if (selectedEnvironment) {
    // Confirm with user
    spinner.stop();
    const prompter = enquirer as PromptModule;
    const useSelected = await prompter
      .prompt<{ confirm: boolean }>({
        type: "confirm",
        name: "confirm",
        message: `Use selected environment ${pc.cyan(selectedEnvironment)}?`,
        initial: true,
      })
      .then((result) => result.confirm)
      .catch(() => false);

    if (useSelected) {
      spinner.info(
        `Using selected environment: ${pc.cyan(selectedEnvironment)}`,
      );
      return selectedEnvironment;
    }
  }

  // If we don't have an environment yet, prompt to select or create one
  const environments = projectExists ? await listEnvironments(projectName) : [];

  // If there are existing environments, show a select prompt
  if (environments.length > 0) {
    const prompter = enquirer as PromptModule;
    const choices = [
      ...environments.map((env) => ({ name: env.name, value: env.name })),
      ...(allowCreate
        ? [
            {
              name: "Create a new environment",
              value: "Create a new environment",
            },
          ]
        : []),
    ];

    const selection = await prompter
      .prompt<{ environment: string }>({
        type: "select",
        name: "environment",
        message: "Select an environment to use:",
        choices,
      })
      .then((result) => result.environment)
      .catch(() => null);

    if (selection === "Create a new environment") {
      // Create a new environment
      const newEnvName = await prompter
        .prompt<{ name: string }>({
          type: "input",
          name: "name",
          message: "Enter a name for the new environment:",
          validate: (value: string) =>
            value.trim() !== "" || "Environment name cannot be empty",
        })
        .then((result) => result.name)
        .catch(() => null);

      if (newEnvName) {
        if (!projectExists) {
          spinner.start(
            `Creating project ${pc.cyan(projectName)} and environment ${pc.cyan(newEnvName)}...`,
          );
          await createProject(projectName, newEnvName);
          spinner.succeed(
            `Project ${pc.cyan(projectName)} and environment ${pc.cyan(
              newEnvName,
            )} created`,
          );
        } else {
          spinner.start(`Creating environment ${pc.cyan(newEnvName)}...`);
          await createEnvironment(projectName, newEnvName);
          spinner.succeed(`Environment ${pc.cyan(newEnvName)} created`);
        }

        // Save as selected environment
        await selectEnvironment(projectName, newEnvName);
        return newEnvName;
      } else {
        throw new Error("Environment creation cancelled");
      }
    } else if (selection) {
      // Save as selected environment
      await selectEnvironment(projectName, selection);
      return selection;
    } else {
      throw new Error("Environment selection cancelled");
    }
  } else {
    if (!allowCreate) {
      throw new Error("No environments found.");
    }
    // No environments exist, prompt to create one
    const prompter = enquirer as PromptModule;
    const newEnvName = await prompter
      .prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "No environments found. Enter a name for a new environment:",
        initial: "default",
        validate: (value: string) =>
          value.trim() !== "" || "Environment name cannot be empty",
      })
      .then((result) => result.name)
      .catch(() => "default");

    if (!projectExists) {
      spinner.start(
        `Creating project ${pc.cyan(projectName)} and environment ${pc.cyan(
          newEnvName,
        )}...`,
      );
      await createProject(projectName, newEnvName);
      spinner.succeed(
        `Project ${pc.cyan(projectName)} and environment ${pc.cyan(newEnvName)} created`,
      );
    } else {
      spinner.start(`Creating environment ${pc.cyan(newEnvName)}...`);
      await createEnvironment(projectName, newEnvName);
      spinner.succeed(`Environment ${pc.cyan(newEnvName)} created`);
    }

    // Save as selected environment
    await selectEnvironment(projectName, newEnvName);
    return newEnvName;
  }
}
