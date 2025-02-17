import { OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { ChatCompletion as ChatCompletionOutput } from "openai/resources/chat/completions.js";

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

  const result = await gsx.execute<ChatCompletionOutput>(
    <OpenAIProvider
      apiKey={process.env.OPENAI_API_KEY}
      componentOpts={{ name: "CodeAgent" }}
    >
      <CodeAgent message={instructions} repoPath={repoPath} />
    </OpenAIProvider>,
  );

  console.log(result);
  console.log(result.choices[0].message.content);

  console.log("\n✅ Code agent finished running.");
}

main().catch(console.error);
