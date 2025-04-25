# GenSX Chat Memory Example

This example shows you how to build a chat application with persistent memory using GenSX. We'll use OpenAI's GPT-4o-mini model and store chat history in [GenSX Cloud blob storage](https://www.gensx.com/docs/cloud/storage/blob-storage).

## Overview

This application leverages:
- `@gensx/core` for workflow management
- `@gensx/openai` for OpenAI integration
- `@gensx/storage` for persistent chat history storage

The ChatMemoryWorkflow takes a `threadId` and a `message` as inputs. Each chat thread maintains its own conversation history, enabling context-aware responses across multiple interactions.

Here's what happens when you run the workflow:
1. The system loads any existing chat history for your specified thread
2. Your message and chat history are processed using GPT-4o-mini
3. The updated conversation history is saved
4. The assistant's response is displayed

## Getting Started

1. Log in to GenSX (if you haven't already):

    ```bash
    npx gensx login
    ```

2. Install the required dependencies:

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
   pnpm deploy
   ```

2. Start a conversation by calling the workflow:

   ```bash
   gensx run ChatMemoryWorkflow --input '{"threadId": "thread-1", "message": "What is the capital of France?"}'
   ```

3. Continue the conversation by using the same `threadId`:

   ```bash
   gensx run ChatMemoryWorkflow --input '{"threadId": "thread-1", "message": "Tell me more about its history"}'
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflow, test it, analyze traces, and get code snippets.

## Running locally

### Test the workflow directly

You can run the workflow directly using the `src/index.tsx` file:

```bash
pnpm dev thread-1 "What is the capital of France?"
```

### Run the API locally

You can also test the workflow through a local API server:

```bash
pnpm start
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

```bash
curl -X POST http://localhost:1337/workflows/ChatMemoryWorkflow \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "thread-1",
    "message": "Hello, how are you?"
  }'
   ```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
