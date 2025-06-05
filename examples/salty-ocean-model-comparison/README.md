# Model Comparison - Why is the Ocean Salty?

This example shows how to compare responses from different AI models using GenSX with the Vercel AI SDK.

## Overview

The workflow sends the same prompt to every available model from each provider (OpenAI and Groq by default) and prints the results.

## Getting Started

1. Log in to GenSX:

   ```bash
   npx gensx login
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up your environment variables:

   ```bash
   export OPENAI_API_KEY=your_openai_api_key
   export GROQ_API_KEY=your_groq_api_key
   ```

### Running in GenSX Cloud

1. Deploy the workflow:

   ```bash
   pnpm run deploy
   ```

2. Run the workflow:

   ```bash
   gensx run GetModelHistoryAcrossProviders
   ```

### Running locally

Run the workflow directly:

```bash
pnpm dev "Why is the ocean salty?"
```

Or start a local API server:

```bash
pnpm start
```

Then call the workflow via HTTP:

```bash
curl -X POST http://localhost:1337/workflows/GetModelHistoryAcrossProviders \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Why is the ocean salty?"
  }'
```

A swagger UI will be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui).
