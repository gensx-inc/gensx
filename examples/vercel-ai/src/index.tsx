import { VercelWorkflow } from "./workflows.js";

// Get the question from command line arguments
const prompt = process.argv[2];

if (!prompt) {
  console.error("Please provide a prompt as a command line argument");
  console.error('Example: pnpm start "Write a poem about a cat"');
  process.exit(1);
}

// Then run the query
console.log("Processing your prompt...");
const result = await VercelWorkflow.run({
  prompt,
});

console.log("Response:");
console.log(result);
