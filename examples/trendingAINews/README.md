# Perplexity AI Search Example

This example demonstrates how to use GenSX with Perplexity AI's OpenAI-compatible interface for search functionality.

## What it demonstrates

- Using Perplexity AI's OpenAI-compatible API interface

## Usage

```bash
# Install dependencies
pnpm install

# Set your Perplexity API key
export PERPLEXITY_API_KEY=<your_api_key>

# Run the example
pnpm run start
```

The example will:

1. Initialize the Perplexity AI client using the OpenAI-compatible endpoint
2. Accept search queries
3. Perform web searches and process results using Perplexity's AI
4. Return formatted, AI-enhanced search responses

## Development

To run in development mode with hot reloading:

```bash
pnpm run dev
```

## Project Structure

- `src/index.tsx` - Main entry point with Perplexity AI integration
- `src/perplexity.tsx` - Perplexity AI search component implementation
