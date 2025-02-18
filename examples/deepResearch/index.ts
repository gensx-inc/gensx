import { gsx } from "gensx";

import { DeepResearchWorkflow } from "./deepResearch.js";

async function main() {
  const prompt =
    "find research comparing the writing style of humans and LLMs. We want to figure out how to quantify the differences.";
  console.log("\n🚀 Starting deep research workflow with prompt: ", prompt);
  const result = await gsx
    .workflow("DeepResearchExample", DeepResearchWorkflow)
    .run({
      prompt,
    });

  console.log("\n\n");
  console.log("=".repeat(50));
  console.log("Final Report");
  console.log("=".repeat(50));
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
