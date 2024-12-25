import * as gsx from "@/index";
import {
  HNAnalyzerWorkflow,
  HNAnalyzerWorkflowOutput,
} from "./hackerNewsAnalyzer";
import * as fs from "fs/promises";

async function main() {
  // console.log("🚀 Starting blog writing workflow");

  // // Use the gensx function to execute the workflow and annotate with the output type.
  // const result = await gsx.execute<string>(
  //   <BlogWritingWorkflow prompt="Write a blog post about the future of AI" />,
  // );
  // console.log("✅ Final result:", { result });
  console.log("🚀 Starting HN analysis workflow...");

  // Request all 500 stories since we're filtering to text-only posts
  const { report, tweet } = await gsx.execute<HNAnalyzerWorkflowOutput>(
    <HNAnalyzerWorkflow postCount={500} />,
  );

  // Write outputs to files
  await fs.writeFile("hn_analysis_report.md", report);
  await fs.writeFile("hn_analysis_tweet.txt", tweet);

  console.log(
    "✅ Analysis complete! Check hn_analysis_report.md and hn_analysis_tweet.txt",
  );
}

await main();
