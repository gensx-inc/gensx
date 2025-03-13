import pc from "picocolors";

import { login } from "../commands/login.js";
import { logger } from "../logger.js";
import { getState, saveState } from "./config.js";

export async function ensureFirstTimeSetupComplete() {
  const state = await getState();
  if (!state.hasCompletedFirstTimeSetup) {
    // Ensure that we don't ask again.
    await saveState({ hasCompletedFirstTimeSetup: true });
    logger.log(pc.yellow("\nWelcome to GenSX! Let's get you set up first.\n"));
    const { skipped } = await login();
    if (skipped) {
      logger.log(
        pc.dim(
          "\nNote: You can run 'gensx login' at any time to authenticate.",
        ),
      );
    }
  }
}
