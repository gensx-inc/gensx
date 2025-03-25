import { existsSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

import { getAuth } from "../utils/config.js";
import { createServer } from "../utils/dev-server.js";
import { readProjectConfig } from "../utils/project-config.js";

interface StartOptions {
  project?: string;
}

export async function start(file: string, options: StartOptions) {
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

    // Read the project config from gensx.yaml and throw an error if it's not found
    let projectName = options.project;
    if (!projectName) {
      const projectConfig = await readProjectConfig(workingDir);
      if (projectConfig?.projectName) {
        projectName = projectConfig.projectName;
      } else {
        throw new Error(
          "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
        );
      }
    }

    // Try to get the org name and default to "local" if not found
    let orgName = "local";
    try {
      const auth = await getAuth();
      if (auth?.org) {
        orgName = auth.org;
      }
    } catch {
      // Do nothing; org name will default to "local"
    }

    // Create and start the server with the imported workflows
    const server = createServer(workflows, orgName, projectName, {
      port: 1337,
    }).start();

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
    if (error instanceof Error) {
      console.error("Error starting server:", error.message);
    } else {
      console.error("Error starting server:", error);
    }
    process.exit(1);
  }
}
