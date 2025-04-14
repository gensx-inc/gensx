# Vector Search Example

This example demonstrates how to use GenSX's `useSearch` hook to create and query a vector search. It's composed of two main workflows:

- `DataIngestionWorkflow`: Initializes a vector search with a schema and inserts data into the vector search.
- `SearchWorkflow`: Builds a simple agent with a query tool that can answer questions about the data in the vector search.

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up your environment variables:

   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

3. Run the application:

   ```bash
   # Ask a question about the baseball statistics
   pnpm start "Who has the highest batting average?"
   ```

When you run the application, the `DataIngestionWorkflow` will be executed first and create/populate the database if it doesn't exist. Then, the `DatabaseWorkflow` will be executed and the will use the agent and database to answer the question.
