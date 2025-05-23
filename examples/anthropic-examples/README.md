# Anthropic Examples

This example demonstrates how to use GenSX with Anthropic to create various types of chat completions and streaming responses. The example includes multiple workflows showcasing different capabilities like basic chat and streaming responses.

## Overview

The example consists of two main workflows:

- `BasicCompletion`: Simple chat completion without any tools
- `StreamingCompletion`: Streaming chat completion

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
   export ANTHROPIC_API_KEY=your_api_key_here
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

# Streaming chat
curl -X POST http://localhost:1337/workflows/StreamingCompletion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Tell me a story"
  }'
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
