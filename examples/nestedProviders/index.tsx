import { gsx } from "@gensx/core";

import { WriteAndEditTutorial } from "./nestingProviders.js";

async function main() {
  console.log("\n🚀 Starting the tutorial writing workflow...");
  const workflow = gsx.Workflow(
    "WriteAndEditTutorialWorkflow",
    WriteAndEditTutorial,
  );
  const tutorial = await workflow.run({
    subject: "visualizing data with matplotlib",
  });
  console.log("\n✅ Rewritten tutorial from Groq:\n", tutorial);
}

main().catch(console.error);
