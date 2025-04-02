import { spawn } from "node:child_process";
import { exec } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { findUp } from "find-up";

const execPromise = promisify(exec);

export async function bundleWorkflow(
  workflowPath: string,
  outDir: string,
  _watch = false,
  useDocker = true,
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

  if (useDocker) {
    return await bundleWithDocker(packageJsonDir, relativeWorkflowPath, outDir);
  } else {
    return await bundleLocally(packageJsonDir, relativeWorkflowPath, outDir);
  }
}

async function bundleWithDocker(
  packageJsonDir: string,
  relativeWorkflowPath: string,
  outDir: string,
): Promise<string> {
  const buildContainerTag = process.env.BUILD_CONTAINER_TAG ?? "latest";

  let stdout = "";
  let stderr = "";
  try {
    await new Promise<void>((resolve, reject) => {
      const process = spawn("docker", [
        "run",
        "--rm",
        "-v",
        `${packageJsonDir}:/app`,
        "-v",
        `${outDir}:/out`,
        "-e",
        `WORKFLOW_PATH=${relativeWorkflowPath}`,
        `gensxeng/builder:${buildContainerTag}`,
      ]);
      process.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Bundler exited with code ${code}`));
        }
        resolve();
      });
    });

    // This is handled by the build.sh script
    return path.join(outDir, "dist.tar.gz");
  } catch (error) {
    console.error("Error bundling workflow with Docker", error);
    console.error("Stdout:\n", stdout);
    console.error("Stderr:\n", stderr);
    throw error;
  }
}

async function bundleLocally(
  packageJsonDir: string,
  relativeWorkflowPath: string,
  outDir: string,
): Promise<string> {
  try {
    // Create dist directory inside outDir
    const distDir = path.join(outDir, "dist");
    mkdirSync(distDir, { recursive: true });

    // Move to the project directory
    const originalDir = process.cwd();
    process.chdir(packageJsonDir);

    // Install @vercel/ncc if not already installed
    try {
      await execPromise("npx --no-install @vercel/ncc --version");
    } catch (_error) {
      await execPromise("npm install -g @vercel/ncc");
    }

    // Build with ncc
    const { stdout: _stdout, stderr } = await execPromise(
      `npx @vercel/ncc build ./${relativeWorkflowPath} -o ${distDir} --target es2022`,
    );

    if (stderr) {
      // Process stderr if needed
    }

    // Create tar.gz file (for compatibility with Docker build)
    process.chdir(distDir);
    await execPromise(`tar -czvf ../dist.tar.gz *`);

    // Return to original directory
    process.chdir(originalDir);

    // Return the compiled directory path for direct file access
    return distDir;
  } catch (error) {
    console.error("Error bundling workflow locally", error);
    throw error;
  }
}
