import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

// Define schema for gensx.yaml
const ProjectConfigSchema = z.object({
  projectName: z.string(),
  description: z.string().optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * Get the path to the gensx.yaml file
 */
export function getProjectConfigPath(dir: string): string {
  return path.join(dir, "gensx.yaml");
}

/**
 * Read the gensx.yaml file and return the parsed config
 */
export async function readProjectConfig(
  dir: string,
): Promise<ProjectConfig | null> {
  try {
    const configPath = getProjectConfigPath(dir);
    const content = await readFile(configPath, "utf-8");

    // Simple YAML parser for our specific needs
    // We'll keep it basic since our format is simple
    const lines = content.split("\n");
    const config: Record<string, string> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;

      const [key, ...valueParts] = trimmedLine.split(":");
      if (key && valueParts.length > 0) {
        const value = valueParts.join(":").trim();
        // Remove quotes if they exist
        config[key.trim()] = value.replace(/^['"](.*)['"]$/, "$1");
      }
    }

    return ProjectConfigSchema.parse(config);
  } catch {
    return null;
  }
}

/**
 * Save a config object to the gensx.yaml file
 */
export async function saveProjectConfig(
  config: Partial<ProjectConfig>,
  dir: string,
): Promise<void> {
  const configPath = getProjectConfigPath(dir);

  // Get existing config first
  const existingConfig = (await readProjectConfig(dir)) ?? {};
  const mergedConfig = { ...existingConfig, ...config };

  // Basic YAML serialization
  const content = Object.entries(mergedConfig)
    .map(([key, value]) => {
      // Quote strings with spaces
      const formattedValue =
        typeof value === "string" && value.includes(" ") ? `"${value}"` : value;
      return `${key}: ${formattedValue}`;
    })
    .join("\n");

  const finalContent = `# GenSX Project Configuration
# Generated on: ${new Date().toISOString()}

${content}
`;

  await writeFile(configPath, finalContent, "utf-8");
}
