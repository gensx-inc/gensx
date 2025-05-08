import fs from "fs/promises";

// Removed gensx import as Workflow wrapper is no longer used
// import * as gensx from "@gensx/core";
// Import the decorated function directly, using .js extension for runtime resolution
import { AnalyzeHackerNewsTrends } from "./analyzeHNTrends.js"; // Use .js extension

async function main() {
  console.log("\n🚀 Starting HN analysis workflow...");

  // Directly await the decorated workflow function
  const { report, tweet } = await AnalyzeHackerNewsTrends({
    postCount: 500,
    componentOpts: {
      name: "AnalyzeHackerNewsWorkflow",
      metadata: {
        // Example: custom_run_id: 'xyz'
      },
    },
  });

  // Write outputs to files
  await fs.writeFile("hn_analysis_report.md", report);
  await fs.writeFile("hn_analysis_tweet.txt", tweet);
  console.log(
    "✅ Analysis complete! Check hn_analysis_report.md and hn_analysis_tweet.txt",
  );
}

main().catch(console.error);
