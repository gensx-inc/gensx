# Blog Writer Example

This example demonstrates how to use GenSX to call sub-workflows, via a call to `execute` inside of a component. This is demonstrated by implementing the ReAct pattern, where the agent calls the research tool, then the write tool, then the edit tool, and then returns the final blog post.

## What it demonstrates

- Complex component implementation
- Using `execute` to call sub-workflows

## Usage

```bash
# Install dependencies
pnpm install

# Run the example
OPENAI_API_KEY=<your_api_key> npm run run
```

The example will generate a blog post based on the prompt "Write a blog post about the future of AI". You can modify the prompt in `index.tsx` to generate different content.
