# Deep Research Example

This example demonstrates how to use GenSX to create an AI-powered deep research workflow. The workflow leverages the Arxiv and Firecrawl APIs to find, filter, and summarize research papers, ultimately generating a research report based on a user prompt.

## Overview

The DeepResearchWorkflow takes a `prompt` as input and orchestrates a multi-step research process:

1. Converts the prompt into a series of queries
2. Uses the [Arxiv API](https://arxiv.org/help/api/user-manual) to retrieve relevant research papers
3. Determines if the papers are relevant to the prompt
4. Scrapes the full text of the relevant papers using the [Firecrawl API](https://www.firecrawl.dev/)
5. Summarizes the relevant parts of the papers
6. Uses the summaries to generate a research report

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
   export FIRECRAWL_API_KEY=your_firecrawl_api_key
   export OPENAI_API_KEY=your_openai_api_key
   ```

## Running in GenSX Cloud

To run the workflow in GenSX Cloud:

1. Deploy your workflow:

   ```bash
   pnpm run deploy
   ```

2. Start a research job by calling the workflow:

   ```bash
   gensx run DeepResearch --input '{"prompt": "find research comparing the writing style of humans and LLMs. We want to figure out how to quantify the differences."}'
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflow, test it, analyze traces, and get code snippets.

## Running locally

### Test the workflow directly

You can run the workflow directly using the `src/index.ts` file:

```bash
pnpm dev "find research comparing the writing style of humans and LLMs. We want to figure out how to quantify the differences."
```

### Run the API locally

You can also start a local API server to test the workflow via HTTP:

```bash
pnpm start
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

```bash
curl -X POST http://localhost:1337/workflows/DeepResearchWorkflow \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "find research comparing the writing style of humans and LLMs. We want to figure out how to quantify the differences."
  }'
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
