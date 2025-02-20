import { consola } from "consola";

/**
 * Waits for a single keypress in the terminal.
 * Falls back to waiting for Enter in non-TTY environments.
 * Handles cleanup and process termination gracefully.
 */
export async function waitForKeypress(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!process.stdin.isTTY) {
        // For non-TTY environments, fall back to regular input
        consola.info("Press Enter to continue...");
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        const onData = () => {
          cleanup();
          resolve();
        };

        process.stdin.once("data", onData);
        return;
      }

      const cleanup = () => {
        try {
          process.stdin.removeAllListeners("data");
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdin.pause();
        } catch (_cleanupErr) {
          // Ignore cleanup errors
        }
      };

      // Handle process termination
      const exitHandler = () => {
        cleanup();
        process.exit();
      };

      // Ensure cleanup on various termination signals
      process.on("SIGINT", exitHandler);
      process.on("SIGTERM", exitHandler);
      process.on("SIGQUIT", exitHandler);

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      const onData = (data: string) => {
        // ctrl-c or ctrl-d
        if (data === "\u0003" || data === "\u0004") {
          cleanup();
          process.exit(1);
        }

        cleanup();
        // Remove the termination handlers
        process.removeListener("SIGINT", exitHandler);
        process.removeListener("SIGTERM", exitHandler);
        process.removeListener("SIGQUIT", exitHandler);
        resolve();
      };

      process.stdin.on("data", onData);
    } catch (_setupErr) {
      // If anything fails in raw mode setup, fall back to regular input
      consola.info("Press Enter to continue...");
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      const onData = () => {
        process.stdin.removeAllListeners("data");
        process.stdin.pause();
        resolve();
      };

      process.stdin.once("data", onData);
    }
  });
}
