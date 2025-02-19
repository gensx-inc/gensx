import { createGensxProject } from "create-gensx";
import pc from "picocolors";

interface NewCommandOptions {
  template: string;
  force: boolean;
}

export async function newProject(
  projectPath: string,
  options: NewCommandOptions,
) {
  try {
    await createGensxProject(projectPath, options);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(pc.red(`\nError: ${error.message}`));
    } else {
      console.error(pc.red("\nAn unknown error occurred"));
    }
    process.exit(1);
  }
}
