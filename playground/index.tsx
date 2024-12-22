import * as gsx from "@/index";
import { BlogWritingWorkflow } from "./blogWriter";

async function main() {
  console.log("🚀 Starting blog writing workflow");

  // Use the gensx function to execute the workflow and annotate with the output type.
  const result = await gsx.execute<string>(
    <BlogWritingWorkflow prompt="Write a blog post about the future of AI" />,
  );
  console.log("✅ Final result:", { result });
}

await main();
