import { NewCommandOptions, newProject } from "gensx";

export type { NewCommandOptions };

export async function createGensxProject(
  projectPath: string,
  options: NewCommandOptions,
) {
  await newProject(projectPath, options);
}
