import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

import { findUp } from "find-up";

export async function bundleWorkflow(
  workflowPath: string,
  outDir: string,
  onProgress: (data: string) => void,
  _watch = false,
) {
  // remove anything in the outDir
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  } else {
    mkdirSync(outDir, { recursive: true });
  }

  // run the gensx-bundler docker container, and mount the closest directory to the workflow path that contains a package.json
  // also mount the output directory

  // find the closest directory to the workflow path that contains a package.json
  const packageJsonPath = await findUp("package.json", {
    cwd: path.dirname(workflowPath),
  });

  if (!packageJsonPath) {
    throw new Error("No package.json found");
  }

  const packageJsonDir = path.dirname(packageJsonPath);
  const relativeWorkflowPath = path.relative(packageJsonDir, workflowPath);

  const buildContainerTag = process.env.BUILD_CONTAINER_TAG ?? "latest";

  let stdout = "";
  let stderr = "";
  try {
    await new Promise<void>((resolve, reject) => {
      const builderProcess = spawn("docker", [
        "run",
        "--rm",
        process.env.BUILD_CONTAINER_TAG ? "--pull=missing" : "--pull=always", // Don't force a pull if we're using a custom tag
        "--platform",
        "linux/x86_64",
        "-v",
        `${packageJsonDir}:/app`,
        "-v",
        `${outDir}:/out`,
        "-e",
        `WORKFLOW_PATH=${relativeWorkflowPath}`,
        `gensx/builder:${buildContainerTag}`,
      ]);
      builderProcess.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
        onProgress(`[stdout] ${data.toString()}`);
      });

      builderProcess.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
        onProgress(`[stderr] ${data.toString()}`);
      });

      builderProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Bundler exited with code ${code}`));
        }
        resolve();
      });
    });

    // This is handled by the build.sh script
    return path.join(outDir, "dist.tar.gz");
  } catch (error) {
    console.error("Error bundling workflow", error);
    console.error("Stdout:\n", stdout);
    console.error("Stderr:\n", stderr);
    throw error;
  }
}
