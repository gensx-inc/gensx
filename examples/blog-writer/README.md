# GenSX Blog Writer Example

This example demonstrates how to use GenSX to create an AI-powered blog writing workflow.

## Overview

The `WriteBlog` workflow takes a `prompt` as input and generates a complete blog post using OpenAI's GPT-4o-mini model. The workflow includes researching, drafting, and editing the blog post to produce engaging long-form content.

The workflow follows these steps:

1. The model brainstorms 3-5 topics to research based on the prompt
2. Online research is conducted in parallel for each topic.
3. A draft blog post is written using the research
4. The draft is edited to improve engagement and clarity
5. The final blog post is output

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
   export PERPLEXITY_API_KEY=your_api_key_here
   ```

## Running in GenSX Cloud

To run the workflow in GenSX Cloud:

1. Deploy your workflow:

   ```bash
   pnpm dev
   ```

2. Generate a blog post by calling the workflow:

   ```bash
   gensx run WriteBlog --input '{"prompt": "Write a blog post about the future of AI"}'
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflow, test it, analyze traces, and get code snippets.

## Running locally

### Test the workflow directly

You can run the workflow directly using the `index.ts` file:

```bash
pnpm run dev
```

This will generate a blog post based on the prompt in the code. You can modify the prompt in `index.ts` to generate different content.

### Run the API locally

You can also test the workflow through a local API server:

```bash
pnpm start
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

```bash
curl -X POST http://localhost:1337/workflows/WriteBlog \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a blog post about the future of AI"
  }'
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
