import { InitializeDatabase, TextToSqlWorkflow } from "./workflows.js";

// Get the question from command line arguments
const question = process.argv[2];

if (!question) {
  console.error("Please provide a question as a command line argument");
  console.error('Example: pnpm dev "Who has the highest batting average?"');
  process.exit(1);
}

// First, initialize the database
console.log("Initializing database...");
const initMessage = await InitializeDatabase();
console.log(initMessage);

// Then run the query
console.log("Processing your question...");
const result = await TextToSqlWorkflow({
  question,
});

console.log("Response:");
console.log(result);
