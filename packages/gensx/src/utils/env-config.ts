import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { checkEnvironmentExists } from "../models/environment.js";
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
