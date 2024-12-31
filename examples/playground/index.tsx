import fs from "fs/promises";
import { gsx } from "gensx";

import { BlogWritingWorkflow } from "./blogWriter";
import { ChatCompletion } from "./chatCompletion";
import {
  HNAnalyzerWorkflow,
  HNAnalyzerWorkflowOutput,
} from "./hackerNewsAnalyzer";

// Example 1: Simple blog writing workflow
async function runBlogWritingExample() {
  console.log("\n🚀 Starting blog writing workflow");
  const result = await gsx.execute<string>(
    <BlogWritingWorkflow prompt="Write a blog post about the future of AI" />,
  );
  console.log("✅ Blog writing complete:", { result });
}

// Example 2: HN analysis workflow with parallel execution
async function runHNAnalysisExample() {
  console.log("\n🚀 Starting HN analysis workflow...");
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

// Example 3: Streaming vs non-streaming chat completion
async function runStreamingWithChildrenExample() {
  const prompt =
    "Write a 250 word story about an AI that discovers the meaning of friendship through a series of small interactions with humans. Be concise but meaningful.";

  console.log("\n🚀 Starting streaming example with prompt:", prompt);

  console.log("\n📝 Non-streaming version (waiting for full response):");
  await gsx.execute<string>(
    <ChatCompletion prompt={prompt}>
      {async (response: string) => {
        console.log(response);
      }}
    </ChatCompletion>,
  );

  console.log("\n📝 Streaming version (processing tokens as they arrive):");
  await gsx.execute(
    <ChatCompletion stream={true} prompt={prompt}>
      {async (response: gsx.Streamable<string>) => {
        // Print tokens as they arrive
        for await (const token of {
          [Symbol.asyncIterator]: () => response.stream(),
        }) {
          process.stdout.write(token);
        }
        process.stdout.write("\n");
        console.log("✅ Streaming complete");
      }}
    </ChatCompletion>,
  );
}

async function runStreamingExample() {
  const prompt =
    "Write a 250 word story about an AI that discovers the meaning of friendship through a series of small interactions with humans. Be concise but meaningful.";

  console.log("\n🚀 Starting streaming example with prompt:", prompt);

  console.log("\n📝 Non-streaming version (waiting for full response):");
  const finalResult = await gsx.execute<string>(
    <ChatCompletion prompt={prompt} />,
  );
  console.log("✅ Complete response:", finalResult);

  console.log("\n📝 Streaming version (processing tokens as they arrive):");
  const response = await gsx.execute<Streamable<string>>(
    <ChatCompletion stream={true} prompt={prompt} />,
  );

  for await (const token of {
    [Symbol.asyncIterator]: () => response.stream(),
  }) {
    process.stdout.write(token);
  }
  process.stdout.write("\n");
  console.log("✅ Streaming complete");
}

// Main function to run examples
async function main() {
  await runBlogWritingExample();
  await runHNAnalysisExample();
  await runStreamingWithChildrenExample();
  await runStreamingExample();
}

main().catch(console.error);
