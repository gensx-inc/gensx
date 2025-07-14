import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

// Define schema for gensx.yaml
const ProjectConfigSchema = z.object({
  projectName: z.string(),
  environmentName: z.string().optional(),
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
export function readProjectConfig(dir: string): ProjectConfig | null {
  try {
    const configPath = getProjectConfigPath(dir);
    const content = readFileSync(configPath, "utf-8");

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
