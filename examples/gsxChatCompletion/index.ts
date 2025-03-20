import { createServer } from "./dev-server.js";
import * as workflows from "./workflows.js";

function main() {
  console.log("🔍 Starting GenSX Dev Server with workflows...");

  // Create and start the server with the imported workflows
  const server = createServer(workflows, { port: 1337 }).start();

  // List all available workflows with their API URLs
  console.log("\n📋 Available workflows:");

  // Log each workflow
  const allWorkflows = server.getWorkflows();
  if (allWorkflows.length === 0) {
    console.log(
      "⚠️ No workflows found. Make sure workflows are exported correctly in workflows.tsx",
    );
  } else {
    allWorkflows.forEach((workflow) => {
      console.log(`- ${workflow.name}: ${workflow.api_url}`);
    });
  }

  console.log("\n✅ Server is running. Press Ctrl+C to stop.");
}

// Handle errors during startup
try {
  main();
} catch (err) {
  console.error("❌ Error starting server:", err);
  // Using conditional to check if process is available at runtime
  if (typeof process !== "undefined") {
    process.exit(1);
  }
}
