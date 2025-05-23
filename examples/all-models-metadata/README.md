# GenSX OpenRouter Models Metadata Explorer

This example demonstrates how to use GenSX to create a workflow that fetches and displays metadata about AI models available through OpenRouter.

## Overview

The GetAllOpenRouterModelPricing workflow takes no input and performs the following steps:

1. Fetches all available models from the OpenRouter API
2. Processes and formats model information including pricing details
3. Sorts models alphabetically for easy reference
4. Calculates and formats pricing per million tokens
5. Displays a comprehensive list of all models with their metadata

## Getting Started

1. Log in to GenSX (if you haven't already):

   ```bash
   npx gensx login
   ```

2. Install the required dependencies:

   ```bash
   npm install
   ```

3. Set up your environment variables:

   ```bash
   export OPENROUTER_API_KEY=your_openrouter_api_key
   ```

## Running in GenSX Cloud

To run the workflow in GenSX Cloud:

1. Deploy your workflow:

   ```bash
   npm run deploy
   ```

2. Start the workflow:

   ```bash
   gensx run GetAllOpenRouterModelPricing
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflow, test it, analyze traces, and get code snippets.

## Running locally

### Test the workflow directly

You can run the workflow directly using the `src/index.tsx` file:

```bash
npm run dev
```

### Run the API locally

You can also start a local API server to test the workflow via HTTP:

```bash
npm start
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

```bash
curl -X POST http://localhost:1337/workflows/GetAllOpenRouterModelPricing \
  -H "Content-Type: application/json" \
  -d '{}'
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.