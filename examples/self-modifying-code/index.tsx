import { spawn } from "child_process";
import path from "path";

import { gsx } from "gensx";

import { SelfModifyingCodeAgent } from "./agent/smcAgent.js";
import { acquireLease, releaseLease } from "./lease.js";
import {
  setupWorkspace,
  type Workspace,
  type WorkspaceConfig,
} from "./workspace.js";

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

// flag for testing in development.
const shouldSpawnAgent = true;

async function startNewAgent(workspace: Workspace): Promise<boolean> {
  return new Promise((resolve) => {
    const scopedPath = path.join(
      workspace.sourceDir,
      "examples",
      "self-modifying-code",
    );
    // Start new agent process with same env vars
    const proc = spawn("pnpm", ["dev"], {
      cwd: scopedPath,
      stdio: "inherit",
      env: process.env,
    });

    // Give it 60 seconds to acquire the lease
    const timeout = setTimeout(() => {
      proc.kill();
      resolve(false);
    }, 60000);

    // If process exits early, it failed
    proc.on("exit", (code) => {
      clearTimeout(timeout);
      resolve(code === 0);
    });
  });
}

async function main() {
  let lease;
  let workspace;
  let error: unknown;

  try {
    // Setup phase
    const config = getWorkspaceConfig();
    lease = await acquireLease();
    workspace = await setupWorkspace(config);

    // Run agent workflow
    const workflow = gsx.Workflow("SelfModifyingCode", SelfModifyingCodeAgent);
    const result = await workflow.run({ workspace, lease }, { printUrl: true });

    if (!result.success) {
      error = new Error(`Agent failed: ${result.error}`);
      return;
    }

    // If agent made changes, start a new iteration
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (result.modified && shouldSpawnAgent) {
      console.log("Changes made, starting new iteration...");

      // Release lease before spawning new agent
      console.log("Releasing lease to allow new agent to start...");
      await releaseLease(lease);
      lease = undefined; // Prevent double-release in finally block

      // Give a small delay to allow lease file system operations to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const success = await startNewAgent(workspace);
      if (success) {
        console.log("New iteration started successfully, shutting down");
        process.exit(0);
      } else {
        error = new Error("Failed to start new iteration");
      }
    }
  } catch (e) {
    error = e;
  } finally {
    // Cleanup phase
    if (lease) await releaseLease(lease);
    // if (workspace) await cleanupWorkspace(workspace);
  }

  if (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
