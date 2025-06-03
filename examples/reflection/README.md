# GenSX Self-Reflection Example

This example shows how to use GenSX to implement a self-reflection loop for LLMs, improving the quality of AI-generated outputs by recursively evaluating and refining it. Learn more in the [self-reflection docs](https://gensx.com/docs/patterns/reflection).

## Overview

The self-reflection loop is used to create a `ImproveTextWithReflection` workflow that takes a piece of text as input and iteratively improves it using OpenAI's GPT-4o-mini model. The workflow follows the self-reflection pattern:

1. The model evaluates the text and provides feedback on how it can be improved.
2. The text is improved based on the feedback.
3. Steps 1 and 2 repeat until no further improvements are suggested or a maximum number of iterations is reached.
4. The final, improved text is output.

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
   pnpm run deploy
   ```

2. Run the reflection workflow:

   ```bash
   gensx run ImproveTextWithReflection --input '{"text": "We are a cutting-edge technology company leveraging bleeding-edge AI solutions..."}'
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflow, test it, analyze traces, and get code snippets.

## Running locally

### Test the workflow directly

You can run the workflow directly using the `index.ts` file:

```bash
pnpm dev
```

This will clean a sample text containing buzzwords and jargon. You can modify the input text in `src/index.ts` to clean different content, or pass your own text as a command-line argument:

```bash
pnpm start -- "Your text here to be improved."
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

```bash
curl -X POST http://localhost:1337/workflows/ImproveTextWithReflection \
  -H "Content-Type: application/json" \
  -d '{
    "text": "We are a cutting-edge technology company leveraging bleeding-edge AI solutions..."
  }'
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
