import { NewCommandOptions, newProject } from "../../gensx/dist/index.js";

export type { NewCommandOptions };

export interface CreateOptions {
  template?: string;
  force: boolean;
}

export async function createGensxProject(
  projectPath: string,
  options: NewCommandOptions,
) {
  await newProject(projectPath, options);
}
