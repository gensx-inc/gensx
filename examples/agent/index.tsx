import { gsx } from "gensx";

import { CodeAgent } from "./CodeAgent.js";
async function main() {
  console.log("\n🚀 Starting the code agent example");

  const repoPath = "./connect4Game";
  const instructions =
    "Create a basic connect 4 game in typescript that has two computers play against each other";
  const additionalInstructions = `Use \`cd ${repoPath}\` and \`pnpm run start\` in the repository directory to run the game`;

  console.log("Repo path:", repoPath);
  console.log("Instructions:", instructions);

  // log the current working directory
  console.log("Current working directory:", process.cwd());

  const agent = gsx.Workflow("CodeAgent", CodeAgent);

  const result = await agent.run({
    task: instructions,
    additionalInstructions,
    repoPath,
  });

  console.log(result.choices[0].message.content);

  console.log("\n✅ Code agent finished running.");
}

main().catch(console.error);
