import { createGensxProject } from "create-gensx";
import pc from "picocolors";

import { logger } from "../logger.js";
import { readConfig, saveState } from "../utils/config.js";
import { login } from "./login.js";

interface NewCommandOptions {
  template?: string;
  force: boolean;
}

export async function newProject(
  projectPath: string,
  options: NewCommandOptions,
) {
  try {
    // Check if user has completed first-time setup
    const { state } = await readConfig();
    if (!state.hasCompletedFirstTimeSetup) {
      // Ensure that we don't ask again.
      await saveState({ hasCompletedFirstTimeSetup: true });
      logger.log(
        pc.yellow("\nWelcome to GenSX! Let's get you set up first.\n"),
      );
      const { skipped } = await login();
      if (skipped) {
        logger.log(
          pc.dim(
            "\nNote: You can run 'gensx login' at any time to authenticate.",
          ),
        );
      }
    }

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
