import fs from "fs/promises";

import { AnalyzeHackerNewsTrends } from "./workflows.js";

async function main() {
  console.log("\n🚀 Starting HN analysis workflow...");

  // Directly await the decorated workflow function
  const { report, tweet } = await AnalyzeHackerNewsTrends({
    postCount: 500,
  });

  // Write outputs to files
  await fs.writeFile("hn_analysis_report.md", report);
  await fs.writeFile("hn_analysis_tweet.txt", tweet);
  console.log(
    "✅ Analysis complete! Check hn_analysis_report.md and hn_analysis_tweet.txt",
  );
}

await main().catch(console.error);
