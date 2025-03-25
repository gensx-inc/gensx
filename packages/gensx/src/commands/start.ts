import { existsSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

import { createServer } from "../utils/dev-server.js";

export async function start(file: string) {
  try {
    console.info("🔍 Starting GenSX Dev Server...");

    // Resolve the file path
    const workingDir = process.cwd();
    const resolvedPath = isAbsolute(file) ? file : resolve(workingDir, file);

    // Convert TSX path to compiled JS path
    const dir = dirname(resolvedPath);
    const fileName = basename(resolvedPath, ".tsx");
    const jsPath = join(dir, "dist", `${fileName}.js`);

    // Check if compiled JS file exists
    if (!existsSync(jsPath)) {
      throw new Error(
        `Compiled workflow file not found: ${jsPath}\nPlease ensure your TypeScript files are compiled before running the server.`,
      );
    }

    // Convert the file path to a URL for import
    const fileUrl = `file://${jsPath}`;
    const workflows = (await import(fileUrl)) as Record<string, unknown>;

    // Create and start the server with the imported workflows
    const server = createServer(workflows, { port: 1337 }).start();

    // List all available workflows with their API URLs
    console.info("\n📋 Available workflows:");

    // Log each workflow
    const allWorkflows = server.getWorkflows();
    if (allWorkflows.length === 0) {
      console.info(
        "⚠️ No workflows found. Make sure workflows are exported correctly in workflows.tsx",
      );
    } else {
      allWorkflows.forEach((workflow) => {
        console.info(`- ${workflow.name}: ${workflow.api_url}`);
      });
    }

    console.info("\n✅ Server is running. Press Ctrl+C to stop.");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}
