import { ChatMemoryWorkflow } from "./workflows.js";

// Run the workflow with a specific thread ID
const threadId = process.argv[2] || "default-thread";
const userInput =
  process.argv[3] || "Hi there! Tell me something interesting about my thread.";

console.log(`Using thread: ${threadId}`);
console.log(`User input: ${userInput}`);

const result = await ChatMemoryWorkflow.run(
  {
    userInput,
    threadId,
  },
  { printUrl: true },
);

console.log("\nAssistant response:");
console.log(result);
