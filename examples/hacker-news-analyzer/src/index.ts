import fs from "fs/promises";

import { AnalyzeHackerNewsTrendsWorkflow } from "./workflows.js";

async function main() {
  console.log("\n🚀 Starting HN analysis workflow...");
  const { report, tweet } = await AnalyzeHackerNewsTrendsWorkflow.run(
    {
      postCount: 500,
    },
    { printUrl: true },
  );

  // Write outputs to files
  await fs.writeFile("hn_analysis_report.md", report);
  await fs.writeFile("hn_analysis_tweet.txt", tweet);
  console.log(
    "✅ Analysis complete! Check hn_analysis_report.md and hn_analysis_tweet.txt",
  );
}

main().catch(console.error);
