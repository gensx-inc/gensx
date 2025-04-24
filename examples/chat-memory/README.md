# GenSX Chat Memory Example

This example demonstrates how to build a chat application with persistent memory using GenSX. It uses OpenAI's GPT-4o-mini model and stores chat history in GenSX Cloud blob storage.

## Features

- Thread-based chat system with persistent memory
- Cloud-based storage for chat history
- OpenAI GPT-4o-mini integration
- Command-line interface for interaction

## Getting Started

### Prerequisites

1. Login to GenSX:

    ```bash
    gensx login
    ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up your environment variables:

   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

### Run the workflow in the cloud

1. Deploy the workflow:

   ```bash
   pnpm deploy
   ```

2. Run the chat application:

   ```bash
   # Specify a thread ID and message
   pnpm start thread-1 "Hello, how are you?"
   ```

### Run the workflow locally

#### Test the workflow directly

1. Run the workflow:

   ```bash
   pnpm dev thread-1 "Hello, how are you?"
   ```

#### Test the workflow API

1. Run the workflow:

   ```bash
   pnpm start
   ```

2. Call the workflow API:

   ```bash
   curl -X POST http://localhost:1337/api/chat -H "Content-Type: application/json" -d '{"threadId": "thread-1", "message": "Hello, how are you?"}'
   ```

   Alternatively, you can navigate to the swagger UI at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.

   The application will:

   - Load any existing chat history for the specified thread
   - Process your message using GPT-4o-mini
   - Save the updated conversation history
   - Display the assistant's response

## How It Works

The application uses:

- `@gensx/core` for workflow management
- `@gensx/openai` for OpenAI integration
- `@gensx/storage` for persistent chat history storage

Each chat thread maintains its own conversation history, allowing for context-aware responses across multiple interactions.

## Example Usage

```bash
# Start a new conversation in thread-1
npm start thread-1 "What is the capital of France?"

# Continue the conversation in the same thread
npm start thread-1 "Tell me more about its history"
```
