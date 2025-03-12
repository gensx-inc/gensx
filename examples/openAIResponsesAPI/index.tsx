import * as gensx from "@gensx/core";
import { OpenAIProvider, OpenAIResponses } from "@gensx/openai";
import { Response } from "openai/resources/responses/responses.mjs";
const ResponseSandbox = gensx.Component<{}, Response>("ExtractEntities", () => {
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <OpenAIResponses model="gpt-4o-mini" input="tell me a joke" />
    </OpenAIProvider>
  );
});

async function main() {
  console.log("\n🚀 Starting the responses API example");

  console.log("\n🎯 Calling the OpenAI Responses API");
  const workflow = gensx.Workflow("ResponsesAPIWorkflow", ResponseSandbox);
  const result = await workflow.run({}, { printUrl: true });
  console.log(result.output_text);
}

main().catch(console.error);
