# GsxChatCompletion Examples

This example demonstrates different ways the `GSXChatCompletion` component can be used. It includes six smaller examples showing how you can use `GSXChatCompletion` for

- Basic chat completions
- Streaming completions
- Tools
- Structured output
- Multi-step tool workflows

## Usage

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key
export OPENAI_API_KEY=<your_api_key>

# Run the example
pnpm run start
```

You can choose which example to run by changing the `example` variable in `index.tsx`. The available examples are:

- `basicCompletion` - Simple chat completion with a system prompt and user message
- `streamingCompletion` - Real-time streaming of chat responses
- `tools` - Using tools with a simple weather tool example
- `toolsStreaming` - Using tools with streaming responses
- `structuredOutput` - Generating structured outputs with a Zod schema
- `multiStepTools` - Using tools in a multi-step workflow
