import { existsSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import ora from "ora";
import pc from "picocolors";
import { Definition } from "typescript-json-schema";

import { createServer } from "../dev-server.js";
import { bundleWorkflow } from "../utils/bundler.js";
import { getAuth } from "../utils/config.js";
import { readProjectConfig } from "../utils/project-config.js";
import { generateSchema } from "../utils/schema.js";

interface StartOptions {
  project?: string;
  quiet?: boolean;
}

interface ServerInstance {
  stop: () => void;
}

export async function start(file: string, options: StartOptions) {
  const quiet = options.quiet ?? false;
  const spinner = ora({ isSilent: quiet });
  let currentServer: ServerInstance | null = null;
  // Store schemas outside the event handler
  let schemas: Record<string, { input: Definition; output: Definition }> = {};

  try {
    console.info("🔍 Starting GenSX Dev Server...");

    // 1. Validate file exists and is a TypeScript file
    const absolutePath = resolve(process.cwd(), file);
    if (!existsSync(absolutePath)) {
      throw new Error(`File ${file} does not exist`);
    }

    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
      throw new Error("Only TypeScript files (.ts or .tsx) are supported");
    }

    // 2. Get project configuration
    let projectName = options.project;
    if (!projectName) {
      const projectConfig = await readProjectConfig(process.cwd());
      if (projectConfig?.projectName) {
        projectName = projectConfig.projectName;
        spinner.info(
          `Using project name from gensx.yaml: ${pc.cyan(projectName)}`,
        );
      } else {
        throw new Error(
          "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
        );
      }
    }

    // 3. Get org name
    let orgName = "local";
    try {
      const auth = await getAuth();
      if (auth?.org) {
        orgName = auth.org;
      }
    } catch (_error) {
      // Do nothing; org name will default to "local"
    }

    // 4. Setup for development mode
    spinner.info("Starting development server...");
    const outDir = resolve(process.cwd(), ".gensx");

    // Build the workflow
    spinner.start("Building locally...");

    try {
      // Bundle the workflow (using local build for dev server)
      const bundleFile = await bundleWorkflow(
        absolutePath,
        outDir,
        true,
        false,
      );
      spinner.succeed("Build completed");

      // Generate schema
      spinner.start("Generating schema");
      schemas = generateSchema(absolutePath);
      const schemaFile = resolve(outDir, "schema.json");
      writeFileSync(schemaFile, JSON.stringify(schemas, null, 2));
      spinner.succeed();

      // Import and start/reload server with new workflows
      let workflows: Record<string, unknown>;

      // The bundler returns a directory path for local builds or a tarball path for Docker builds
      // We need to append index.js for directory imports with ES modules
      const indexPath = bundleFile.endsWith(".tar.gz")
        ? bundleFile // For Docker builds, use the tarball directly
        : resolve(bundleFile, "index.js"); // For local builds, point to the index.js file

      if (existsSync(indexPath)) {
        workflows = (await import(
          `file://${indexPath}?update=${Date.now().toString()}`
        )) as Record<string, unknown>;
      } else {
        throw new Error(`Could not find module at ${indexPath}`);
      }

      // Create and start a new server instance
      const server = createServer(
        workflows,
        orgName,
        projectName,
        {
          port: 1337,
        },
        schemas,
      );

      const serverInstance = server.start();
      currentServer = {
        stop: () => {
          serverInstance.stop();
        },
      };

      // Log available workflows
      const allWorkflows = serverInstance.getWorkflows();
      if (allWorkflows.length === 0) {
        console.info(
          "\n⚠️ No workflows found. Make sure workflows are exported correctly.",
        );
      } else {
        console.info("\n📋 Available workflows:");
        allWorkflows.forEach((workflow) => {
          console.info(`- ${workflow.name}: ${workflow.url}`);
        });
      }

      console.info("\n✅ Server is running. Press Ctrl+C to stop.");

      // Setup cleanup handler
      const cleanup = () => {
        if (currentServer) {
          currentServer.stop();
        }
        process.exit(0);
      };

      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    } catch (error) {
      spinner.fail("Build failed");
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  } catch (error) {
    spinner.fail("Server startup failed");
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("Error:", error);
    }
    process.exit(1);
  }
}
