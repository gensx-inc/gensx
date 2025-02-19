import fs from "fs/promises";

import { gsx } from "gensx";

import { AnalyzeHackerNewsTrends } from "./analyzeHNTrends.js";

async function main() {
  console.log("\n🚀 Starting HN analysis workflow...");
  const { report, tweet } = await gsx
    .Workflow("AnalyzeHackerNewsWorkflow", AnalyzeHackerNewsTrends)
    .run({
      postCount: 500,
    });

  // Write outputs to files
  await fs.writeFile("hn_analysis_report.md", report);
  await fs.writeFile("hn_analysis_tweet.txt", tweet);
  console.log(
    "✅ Analysis complete! Check hn_analysis_report.md and hn_analysis_tweet.txt",
  );
}

main().catch(console.error);
