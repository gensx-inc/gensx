import { gsx } from "gensx";

import { BlogWritingWorkflow } from "./blogWriter.js";

async function main() {
  console.log("\n🚀 Starting blog writing workflow");
  const wf = gsx.workflow("BlogWritingExample", BlogWritingWorkflow);
  const stream = await wf.run({
    stream: true,
    prompt: "Write a blog post about the future of AI",
  });
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
  console.log("\n✅ Blog writing complete");
}

main().catch(console.error);
