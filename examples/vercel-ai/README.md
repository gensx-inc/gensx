# Vector Search Example

This example demonstrates how to use GenSX's `useSearch` hook to create and query a vector search. The workflow provides a RAG (Retrieval Augmented Generation) example where an LLM uses vector search to find relevant information and answer questions. The data is stored in a [GenSX Cloud search namespace](https://www.gensx.com/docs/cloud/storage/search).

## Overview

The example consists of two main components:

- `InitializeSearch`: Creates and populates a vector search namespace with baseball statistics
- `RagWorkflow`: Processes questions by searching through the vector database to find relevant information and generate answers

Here's what happens when you run the RAG workflow:

1. Your question is processed to find relevant information in the vector store
2. The retrieved information is used by the LLM to generate an answer
3. The results are formatted and displayed

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

2. Initialize the vector search:

   ```bash
   gensx run InitializeSearch
   ```

3. Ask questions about baseball statistics:

   ```bash
   gensx run RagWorkflow --input '{"question": "Who plays for the Portland Pioneers?"}'
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflows, test them, analyze traces, and get code snippets.

## Running locally

### Test the workflow directly

You can run the workflow directly:

```bash
pnpm dev "Who plays for the Portland Pioneers?"
```

This will automatically initialize the vector search and run the workflow.

### Run the API locally

You can also test the workflow through a local API server:

```bash
pnpm start
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

Initialize the vector search first:

```bash
curl -X POST http://localhost:1337/workflows/InitializeSearch \
  -H "Content-Type: application/json" \
  -d '{}'
```

Then run the workflow:

```bash
curl -X POST http://localhost:1337/workflows/RagWorkflow \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Who plays for the Portland Pioneers?"
  }'
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
