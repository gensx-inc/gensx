import { initializeBaseballDatabase } from "./data-ingestion.js";
import { DatabaseWorkflow } from "./workflows.js";

// Get the question from command line arguments
const question = process.argv[2];

if (!question) {
  console.error("Please provide a question as a command line argument");
  console.error('Example: pnpm start "Who has the highest batting average?"');
  process.exit(1);
}

// First, initialize the database
console.log("Initializing database...");
const initMessage = await initializeBaseballDatabase();
console.log(initMessage);

// Then run the query
console.log("Processing your question...");
const result = await DatabaseWorkflow.run({
  question,
});

console.log("Response:");
console.log(result);
