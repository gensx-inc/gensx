import { OpenAIAgentWorkflow } from "./workflows.js";

// Run the workflow with a specific thread ID
const threadId = process.argv[2] || "default-thread";
const userInput = process.argv[3] || "what is gensx?";

console.log(`Using thread: ${threadId}`);
console.log(`User input: ${userInput}`);

const result = await OpenAIAgentWorkflow({
  userInput,
});

console.log("\nAssistant response:");
console.log(result);
