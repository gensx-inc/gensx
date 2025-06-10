import { readFileSync } from "node:fs";
import path from "node:path";

import { load } from "js-yaml";
import { z } from "zod";

// Define schema for gensx.yaml
const ProjectConfigSchema = z.object({
  projectName: z.string(),
  environmentName: z.string().optional(),
  description: z.string().optional(),
  public: z.boolean().optional(),
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

    const parsed = (load(content) ?? {}) as unknown;

    return ProjectConfigSchema.parse(parsed);
  } catch {
    return null;
  }
}
