import {
  BasicChatWithToolsWorkflow,
  BasicChatWorkflow,
  StreamingChatWithToolsWorkflow,
  StreamingChatWorkflow,
  StreamingStructuredOutputWorkflow,
  StructuredOutputWorkflow,
} from "./workflows.js";

// Get the workflow type and prompt from command line arguments
const [workflowType, prompt] = process.argv.slice(2);

if (!workflowType || !prompt) {
  console.error(
    "Please provide a workflow type and prompt as command line arguments",
  );
  console.error('Example: pnpm start "basic" "Write a poem about a cat"');
  console.error("\nAvailable workflow types:");
  console.error("- basic: Basic chat completion");
  console.error("- basic-tools: Basic chat with tools");
  console.error("- stream: Streaming chat completion");
  console.error("- stream-tools: Streaming chat with tools");
  console.error("- structured: Structured output");
  console.error("- structured-stream: Streaming structured output");
  process.exit(1);
}

async function main() {
  console.log("Processing your prompt...");

  switch (workflowType) {
    case "basic":
      console.log("Running basic chat workflow...");
      const result = await BasicChatWorkflow.run({
        prompt,
      });
      console.log("Response:");
      console.log(result);
      break;

    case "basic-tools":
      console.log("Running basic chat with tools workflow...");
      const toolsResult = await BasicChatWithToolsWorkflow.run({
        prompt,
      });
      console.log("Response:");
      console.log(toolsResult);
      break;

    case "stream":
      console.log("Running streaming chat workflow...");
      const streamResult = await StreamingChatWorkflow.run({
        prompt,
      });
      for await (const chunk of streamResult.textStream) {
        process.stdout.write(chunk);
      }
      process.stdout.write("\n");
      break;

    case "stream-tools":
      console.log("Running streaming chat with tools workflow...");
      const streamToolsResult = await StreamingChatWithToolsWorkflow.run({
        prompt,
      });
      for await (const chunk of streamToolsResult.textStream) {
        process.stdout.write(chunk);
      }
      process.stdout.write("\n");
      break;

    case "structured":
      console.log("Running structured output workflow...");
      const structuredResult = await StructuredOutputWorkflow.run({
        prompt,
      });
      console.log("Response:");
      console.log(JSON.stringify(structuredResult, null, 2));
      break;

    case "structured-stream":
      console.log("Running streaming structured output workflow...");
      const structuredStreamResult =
        await StreamingStructuredOutputWorkflow.run({
          prompt,
        });
      console.log("Response:");
      for await (const chunk of structuredStreamResult.textStream) {
        process.stdout.write(chunk);
      }
      process.stdout.write("\n");
      break;

    default:
      console.error(`Unknown workflow type: ${workflowType}`);
      console.error(
        "Available workflow types: basic, basic-tools, stream, stream-tools, structured, structured-stream",
      );
      process.exit(1);
  }
}

main().catch(console.error);
