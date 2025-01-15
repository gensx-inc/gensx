# Streaming Example

This example demonstrates how to use GenSX's streaming capabilities with LLM responses. It shows both streaming and non-streaming approaches for comparison.

## What it demonstrates

- Streaming LLM responses token by token
- Handling streaming vs non-streaming responses
- Different patterns for processing streamed content
- Real-time output processing

## Usage

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key
export OPENAI_API_KEY=<your_api_key>

# Run the example
pnpm run run
```

The example will run two versions of the same prompt:

1. A non-streaming version that waits for the complete response
2. A streaming version that processes and displays tokens as they arrive

This helps illustrate the benefits and usage patterns of streaming in GenSX workflows.
