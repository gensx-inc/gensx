import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { dump, load } from "js-yaml";
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
export async function readProjectConfig(
  dir: string,
): Promise<ProjectConfig | null> {
  try {
    const configPath = getProjectConfigPath(dir);
    const content = await readFile(configPath, "utf-8");

    const parsed = (load(content) ?? {}) as unknown;

    return ProjectConfigSchema.parse(parsed);
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

  const yamlContent = dump(mergedConfig, { lineWidth: 0 });
  const finalContent = `# GenSX Project Configuration
# Generated on: ${new Date().toISOString()}

${yamlContent}`;

  await writeFile(configPath, finalContent, "utf-8");
}
