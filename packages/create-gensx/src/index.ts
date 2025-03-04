import { NewCommandOptions, newProject } from "gensx";

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
