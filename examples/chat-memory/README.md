# GenSX Chat Memory Example

This example demonstrates how to build a chat application with persistent memory using GenSX. It uses OpenAI's GPT-4o-mini model and stores chat history in [GenSX Cloud blob storage](https://www.gensx.com/docs/cloud/storage/blob-storage).

## How it works

The application uses:

- `@gensx/core` for workflow management
- `@gensx/openai` for OpenAI integration
- `@gensx/storage` for persistent chat history storage

 When you run the ChatMemoryWorkflow, you'll specify a `threadId` and a `message`. Each chat thread maintains its own conversation history, allowing for context-aware responses across multiple interactions.

 The workflow will:
 1. Load any existing chat history for the specified thread
 2. Process the message and chat history using GPT-4o-mini
 3. Save the updated conversation history
 4. Display the assistant's response

## Prerequisites

1. Login to GenSX if you haven't already:

    ```bash
    npx gensx login
    ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up your environment variables:

   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

## Run the workflow in the cloud

To run the workflow in the GenSX Cloud, follow these steps:

1. Deploy the workflow:

   ```bash
   pnpm deploy
   ```

2. Call the workflow:

   ```bash
   gensx run ChatMemoryWorkflow --input '{"threadId": "thread-1", "message": "What is the capital of France?"}'
   ```

    You can then continue the conversation by calling the workflow again with the same `threadId`.

   ```bash
   gensx run ChatMemoryWorkflow --input '{"threadId": "thread-1", "message": "Tell me more about its history"}'
   ```


Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflow, test it, analyze traces, and get code snippets.

## Run the workflow locally

### Test the workflow directly

You can run the workflow directly using the `src/index.tsx` file:

```bash
pnpm dev thread-1 "What is the capital of France?"
```


### Test the workflow API

Alternatively, you can test the workflow APIs using the local dev server:

```bash
pnpm start
```

This will start a local API server and you can call the workflow API via curl or any HTTP client:

```bash
curl -X POST http://localhost:1337/workflows/ChatMemoryWorkflow \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "thread-1",
    "message": "Hello, how are you?"
  }'
   ```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
