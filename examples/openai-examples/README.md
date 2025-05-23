# OpenAI Examples

This example demonstrates how to use GenSX with OpenAI to create various types of chat completions and streaming responses. The example includes multiple workflows showcasing different capabilities like basic chat, tools integration, and structured output.

## Overview

The example consists of five main workflows:

- `BasicCompletion`: Simple chat completion without any tools
- `StreamingCompletion`: Streaming chat completion
- `Tools`: Chat completion with weather tool integration
- `StreamingTools`: Streaming chat with weather tool integration
- `StructuredOutput`: Structured JSON output for trash bin reviews

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

2. Run any of the available workflows:

   ```bash
   gensx run BasicCompletion --input '{"prompt": "Write a poem about a cat"}'
   gensx run StreamingCompletion --input '{"prompt": "Tell me a story"}'
   gensx run Tools --input '{"prompt": "What\'s the weather like in Seattle?"}'
   gensx run StreamingTools --input '{"prompt": "What\'s the weather like in Portland?"}'
   gensx run StructuredOutput --input '{"prompt": "Review the trash bins in my neighborhood"}'
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflows, test them, analyze traces, and get code snippets.

## Running locally

### Test the workflow directly

You can run any of the workflows directly using the command line:

```bash
# Basic chat
pnpm dev "basic" "Write a poem about a cat"

# Streaming chat
pnpm dev "stream" "Tell me a short story"

# Chat with tools
pnpm dev "tools" "What's the weather like in Seattle?"

# Streaming chat with tools
pnpm dev "stream-tools" "What's the weather like in Portland?"

# Structured output
pnpm dev "structured" "Review the trash bins in my neighborhood"
```

### Run the API locally

You can also test the workflow through a local API server:

```bash
pnpm start
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

```bash
# Basic chat
curl -X POST http://localhost:1337/workflows/BasicCompletion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a poem about a cat"
  }'

# Chat with tools
curl -X POST http://localhost:1337/workflows/Tools \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the weather like in Seattle?"
  }'

# And so on for other workflows...
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
