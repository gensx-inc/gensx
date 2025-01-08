# Reflection Example

This example demonstrates how to use GenSX's `gsx.execute` to execute sub-workflows, as well as recursive component execution. It implements a buzzword cleaning system that uses GPT to iteratively remove business jargon while preserving the original meaning of the text.

## What it demonstrates

- Recursive component implementation using `gsx.execute`
- Integration with OpenAI's GPT model
- State management through component props
- Complex workflow with multiple steps:
  1. Buzzword detection
  2. Text cleaning via GPT
  3. Recursive verification

## Usage

```bash
# Install dependencies
pnpm install

# Run the example
OPENAI_API_KEY=<your_api_key> npm run run
```

The example will clean a sample text containing business buzzwords. You can modify the input text in `index.tsx` to clean different content.
