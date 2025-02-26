import { spawn } from "child_process";
import process from "process";

import { gsx } from "gensx";

import { SelfModifyingCodeAgent } from "./agent/smcAgent.js";
import { acquireLease, releaseLease } from "./lease.js";
import { setupWorkspace, type WorkspaceConfig } from "./workspace.js";

function getWorkspaceConfig(): WorkspaceConfig {
  const repoUrl = process.env.REPO_URL;
  const branch = process.env.BRANCH;

  if (!repoUrl || !branch) {
    throw new Error("Missing required environment variables: REPO_URL, BRANCH");
  }

  return {
    repoUrl,
    branch,
  };
}

// Flag for testing in development
// const shouldSpawnAgent = true;

// Check if this process is a child process
const isChildProcess = process.env.SMC_CHILD_PROCESS === "true";

// Function to run the actual workflow
async function runWorkflow() {
  let lease;
  let error: unknown;
  let modified = false;

  const config = getWorkspaceConfig();
  const workspace = await setupWorkspace(config);

  try {
    // Acquire lease
    lease = await acquireLease();

    // Run agent workflow
    const workflow = gsx.Workflow("SelfModifyingCode", SelfModifyingCodeAgent);
    const result = await workflow.run({ workspace, lease }, { printUrl: true });

    if (!result.success) {
      error = new Error(`Agent failed: ${result.error}`);
      return { success: false, error, modified: false };
    }

    modified = result.modified;
    return { success: true, modified };
  } catch (e) {
    error = e;
    return { success: false, error, modified: false };
  } finally {
    // Cleanup phase
    if (lease) await releaseLease(lease);
  }
}

// Function to spawn a new child process
function spawnChildProcess() {
  console.log("Spawning new child process...");

  try {
    // Create a new environment with the child process flag
    const childEnv = {
      ...process.env,
      SMC_CHILD_PROCESS: "true",
    };

    // Use 'pnpm start' instead of trying to invoke Node directly
    // This ensures we use the correct Node version through pnpm
    const child = spawn("pnpm", ["start"], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: childEnv,
      detached: false,
    });

    console.log("Child process spawned with PID:", child.pid);

    // Handle child process events
    child.on("error", (err) => {
      console.error("Failed to start child process:", err);
      process.exit(1);
    });

    // Handle child process exit
    child.on("exit", (code) => {
      console.log(`Child process exited with code ${code}`);

      // If the child process made modifications (exit code 42),
      // spawn a new child to continue the process
      if (code === 42) {
        console.log("Child made modifications, spawning new child process...");

        // Spawn a new child process
        spawnChildProcess();
      } else {
        // For any other exit code, just exit with the same code
        process.exit(code ?? 0);
      }
    });
  } catch (error) {
    console.error("Error spawning child process:", error);
    process.exit(1);
  }
}

// Main function - acts as the controller
async function main() {
  try {
    if (isChildProcess) {
      // This is a child process, run the workflow
      console.log("Running as child process");
      const result = await runWorkflow();

      if (!result.success) {
        console.error("Workflow failed:", result.error);
        process.exit(1);
      }

      // If modifications were made, signal parent to spawn a new iteration
      if (result.modified) {
        console.log("Changes made, signaling parent to spawn new iteration...");
        // Exit with special code to indicate modifications were made
        process.exit(42);
      } else {
        // No modifications, exit normally
        process.exit(0);
      }
    } else {
      // This is the parent/controller process
      console.log("Running as parent/controller process");

      // Spawn the first child process
      spawnChildProcess();
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
