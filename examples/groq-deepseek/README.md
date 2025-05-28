# Groq DeepSeek R1 Distilled Example

This example demonstrates how to use the Groq DeepSeek R1 Distilled model with [GenSX](https://gensx.com).

## Overview

The `GroqDeepSeekR1Completion` workflow takes a `prompt` as input and returns both the model's thinking process and final completion. The workflow:

1. Processes your prompt using the DeepSeek R1 Distilled model
2. Extracts any thinking content (text between `<think>` tags)
3. Returns both the thinking process and final completion


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
   export GROQ_API_KEY=your-api-key
   ```

## Running in GenSX Cloud

To run the workflow in GenSX Cloud:

1. Deploy your workflow:

   ```bash
   pnpm run deploy
   ```

2. Call the workflow:

   ```bash
   gensx run GroqDeepSeekR1Completion --input '{"prompt": "Write me a blog post about the future of AI."}'
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflow, test it, analyze traces, and get code snippets.

## Running locally

### Test the workflow directly

You can run the workflow directly using the example code:

```bash
pnpm run dev
```

### Run the API locally

You can also test the workflow through a local API server:

```bash
pnpm run start
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

```bash
curl -X POST http://localhost:1337/workflows/GroqDeepSeekR1Completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write me a blog post about the future of AI."
  }'
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.

## Output Format

The workflow returns an object with two fields:

- `thinking`: Extracted content between `<think>` tags, showing the model's reasoning process
- `completion`: The final response with thinking tags removed
