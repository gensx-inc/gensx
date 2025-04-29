import { readFileSync } from "node:fs";
import path from "node:path";

import { getConfigPath } from "./config.js";

interface ProjectEnvironmentConfig {
  selectedEnvironment?: string;
  lastUsed?: string; // ISO date string
}

/**
 * Gets the directory where project-specific configs are stored
 */
function getProjectsConfigDir(): string {
  // Get the config file path and extract the directory
  const configFile = getConfigPath();
  const configDir = path.dirname(configFile);
  const projectsDir = path.join(configDir, "projects");

  return projectsDir;
}

/**
 * Get the path to a project's environment config file
 */
function getProjectsConfigPath(projectName: string): string {
  const projectsDir = getProjectsConfigDir();
  return path.join(projectsDir, `${projectName}.json`);
}

/**
 * Get the selected environment for a project
 */
export function getSelectedEnvironment(projectName: string): string | null {
  try {
    const configPath = getProjectsConfigPath(projectName);
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as ProjectEnvironmentConfig;
    return config.selectedEnvironment ?? null;
  } catch (error) {
    console.error("Error getting selected environment", error);
    return null;
  }
}
