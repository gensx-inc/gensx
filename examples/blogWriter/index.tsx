import { gsx, Streamable } from "gensx";

import { BlogWritingWorkflow } from "./blogWriter.js";

async function main() {
  console.log("\n🚀 Starting blog writing workflow");
  const stream = await gsx.execute<Streamable>(
    <BlogWritingWorkflow
      stream={true}
      prompt="Write a blog post about the future of AI"
    />,
  );
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
  console.log("\n✅ Blog writing complete");
}

main().catch(console.error);
