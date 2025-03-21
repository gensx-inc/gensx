import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import yaml from "yaml";
import { z } from "zod";

// Define schema for gensx.yaml
const ProjectConfigSchema = z.object({
  projectName: z.string(),
  description: z.string().optional(),
  workflows: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      on: z.array(
        z.object({
          schedule: z.object({
            cron: z.string(),
            timezone: z.string(),
            description: z.string().optional(),
          }),
          input: z.object({}).passthrough().optional(),
        }),
      ),
    }),
  ),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * Get the path to the gensx.yaml file
 */
export function getProjectConfigPath(filePath?: string): string | null {
  if (filePath) {
    return filePath;
  }

  // Look for gensx.yaml in the current directory
  const cwd = process.cwd();
  const configPath = path.join(cwd, "gensx.yaml");
  if (existsSync(configPath)) {
    return configPath;
  }

  // Look for gensx.json
  const jsonPath = path.join(cwd, "gensx.json");
  if (existsSync(jsonPath)) {
    return jsonPath;
  }

  return null;
}

/**
 * Read the gensx.yaml file and return the parsed config
 */
export async function readProjectConfig(
  filePath?: string,
): Promise<ProjectConfig | null> {
  try {
    const configPath = getProjectConfigPath(filePath);
    if (!configPath) {
      return null;
    }

    const content = await readFile(configPath, "utf-8");

    if (configPath.endsWith(".json")) {
      return ProjectConfigSchema.parse(JSON.parse(content));
    } else if (configPath.endsWith(".yaml") || configPath.endsWith(".yml")) {
      return ProjectConfigSchema.parse(yaml.parse(content));
    } else {
      throw new Error(`Unsupported config file type: ${configPath}`);
    }
  } catch {
    return null;
  }
}

/**
 * Save a config object to the gensx.yaml file
 */
export async function saveProjectConfig(
  config: Partial<ProjectConfig>,
  filePath: string,
): Promise<void> {
  const configPath = getProjectConfigPath(filePath);
  if (!configPath) {
    throw new Error("No config file found");
  }

  // Get existing config first
  const existingConfig = (await readProjectConfig(configPath)) ?? {};
  const mergedConfig = { ...existingConfig, ...config };

  if (configPath.endsWith(".json")) {
    const content = JSON.stringify(mergedConfig, null, 2);
    await writeFile(configPath, content, "utf-8");
  } else if (configPath.endsWith(".yaml") || configPath.endsWith(".yml")) {
    const content = yaml.stringify(mergedConfig);

    const finalContent = `# GenSX Project Configuration
# Generated on: ${new Date().toISOString()}

${content}
`;

    await writeFile(configPath, finalContent, "utf-8");
  } else {
    throw new Error(`Unsupported config file type: ${configPath}`);
  }
}
