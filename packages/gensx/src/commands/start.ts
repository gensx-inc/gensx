import { existsSync } from "node:fs";
import { resolve } from "node:path";

import ora from "ora";
import pc from "picocolors";
import { watch } from "rollup";
import { OutputOptions } from "rollup";
import { Definition } from "typescript-json-schema";

import { createServer } from "../dev-server.js";
import { getRollupConfig } from "../utils/bundler.js";
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
  let isFirstBuild = true;
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

    // 4. Setup watch mode with Rollup
    spinner.info("Starting development server in watch mode...");
    const outDir = resolve(process.cwd(), ".gensx", "dist");
    const bundleFile = resolve(outDir, "handler.js");
    const rollupConfig = getRollupConfig(absolutePath, bundleFile, true);
    const watcher = watch(rollupConfig);

    const startServer = (workflows: Record<string, unknown>) => {
      // Stop the current server if it exists
      if (currentServer) {
        currentServer.stop();
        if (!quiet) {
          console.info("\n🔄 Restarting server with updated workflows...");
        }
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

      // Only show the "Server is running" message on first start
      if (isFirstBuild && !quiet) {
        console.info("\n✅ Server is running. Press Ctrl+C to stop.");
        isFirstBuild = false;
      }
    };

    // Setup cleanup handler
    const cleanup = () => {
      if (currentServer) {
        currentServer.stop();
      }
      void watcher.close();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Handle Rollup watch events
    watcher.on("event", async (event) => {
      if (event.code === "START") {
        spinner.start("Building...");
      } else if (event.code === "BUNDLE_END") {
        try {
          await event.result.write(rollupConfig.output as OutputOptions);
          spinner.succeed("Build completed");

          // Generate schema
          schemas = generateSchema(absolutePath);

          // Import and start/reload server with new workflows
          const fileUrl = `file://${bundleFile}`;
          const workflows = (await import(fileUrl)) as Record<string, unknown>;

          startServer(workflows);
          await event.result.close();
        } catch (error) {
          spinner.fail("Build failed");
          console.error(error instanceof Error ? error.message : String(error));
        }
      } else if (event.code === "ERROR") {
        spinner.fail("Build failed");
        const errorMessage =
          event.error instanceof Error
            ? event.error.message
            : JSON.stringify(event.error, null, 2);
        console.error(errorMessage);
      }
    });
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
