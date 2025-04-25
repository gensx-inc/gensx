# GenSX Text to SQL Example

This example demonstrates how to use GenSX's `useDatabase` hook to create and query a SQL database. The workflow provides a basic text-to-SQL example where an LLM translates a user's questions into SQL queries to get the results. The data is stored in [GenSX Cloud database storage](https://www.gensx.com/docs/cloud/storage/sql-database).

## Overview

The example consists of two main components:

- `InitializeDatabase`: Creates and populates a database with baseball statistics and schema
- `TextToSqlWorkflow`: Processes natural language questions about baseball statistics and translates them into SQL queries to get the results

Here's what happens when you run the workflow:

1. The system checks if the baseball database exists and initializes it if needed
2. Your question is processed by an agent that converts it to SQL
3. The SQL query is executed against the database
4. The results are formatted and displayed

## Getting Started

1. Log in to GenSX (if you haven't already):

   ```bash
   npx gensx login
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up your environment variables:

   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

## Running in GenSX Cloud

To run the workflow in GenSX Cloud:

1. Deploy your workflow:

   ```bash
   pnpm run deploy
   ```

2. Initialize the database:

   ```bash
   gensx run InitializeDatabase
   ```

3. Ask questions about baseball statistics:

   ```bash
   gensx run TextToSqlWorkflow --input '{"question": "Who has the highest batting average?"}'
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflows, test them, analyze traces, and get code snippets.

## Running locally

### Test the workflow directly

You can run the workflow directly:

```bash
pnpm dev "Who has the highest batting average?"
```

This will automatically initialize the database and run the workflow.

### Run the API locally

You can also test the workflow through a local API server:

```bash
pnpm start
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

Initialize the database first:

```bash
curl -X POST http://localhost:1337/workflows/InitializeDatabase \
  -H "Content-Type: application/json" \
  -d '{}'
```

Then run the workflow:

```bash
curl -X POST http://localhost:1337/workflows/TextToSqlWorkflow \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Who has the highest batting average?"
  }'
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
