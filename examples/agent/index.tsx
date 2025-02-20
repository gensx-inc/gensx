import { gsx } from "gensx";

import { CodeAgent } from "./CodeAgent.js";
async function main() {
  console.log("\n🚀 Starting the code agent example");

  const instructions =
    "Add a new tool to the codebase that prints 'Hello, world!'";
  const repoPath = ".";

  console.log("Repo path:", repoPath);
  console.log("Instructions:", instructions);

  // log the current working directory
  console.log("Current working directory:", process.cwd());

  const agent = gsx.Workflow("CodeAgent", CodeAgent);

  const result = await agent.run({
    message: instructions,
    repoPath,
  });

  console.log(result.choices[0].message.content);

  console.log("\n✅ Code agent finished running.");
}

main().catch(console.error);
