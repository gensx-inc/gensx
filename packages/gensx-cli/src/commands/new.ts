import { createGensxProject } from "create-gensx";
import pc from "picocolors";

import { ensureFirstTimeSetupComplete } from "../utils/first-time-setup.js";

interface NewCommandOptions {
  template?: string;
  force: boolean;
}

export async function newProject(
  projectPath: string,
  options: NewCommandOptions,
) {
  try {
    await ensureFirstTimeSetupComplete();
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
