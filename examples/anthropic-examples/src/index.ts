import {
  BasicCompletion,
  StreamingCompletion
} from "./workflows.js";

// Get the workflow type and prompt from command line arguments
const [workflowType, prompt] = process.argv.slice(2);

if (!workflowType || !prompt) {
  console.error(
    "Please provide a workflow type and prompt as command line arguments",
  );
  console.error('Example: pnpm dev "basic" "Write a poem about a cat"');
  console.error("\nAvailable workflow types:");
  console.error("- basic: Basic chat completion");
  console.error("- stream: Streaming chat completion");
  console.error("- tools: Chat with tools");
  console.error("- stream-tools: Streaming chat with tools");
  console.error("- structured: Structured output");
  process.exit(1);
}

async function main() {
  console.log("Processing your prompt...");

  switch (workflowType) {
    case "basic":
      console.log("Running basic chat workflow...");
      const result = await BasicCompletion({
        prompt,
      });
      console.log("Response:");
      console.log(result);
      break;

    case "stream":
      console.log("Running streaming chat workflow...");
      const streamResult = await StreamingCompletion({
        prompt,
      });
      for await (const chunk of streamResult) {
        if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
          process.stdout.write(chunk.delta.text ?? "");
        }
      }
      process.stdout.write("\n");
      break;

    default:
      console.error(`Unknown workflow type: ${workflowType}`);
      console.error(
        "Available workflow types: basic, stream",
      );
      process.exit(1);
  }
}

main().catch(console.error);
