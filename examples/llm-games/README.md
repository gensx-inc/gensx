# LLM Games - Tic-Tac-Toe

This example allows you to run a Tic-Tac-Toe tournament between two LLMs or an LLM and a computer. You can see the full results of our tournament runs in [this blog post](https://gensx.com/blog/llm-tic-tac-toe).

## Usage

### Running the example

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key or any relevant key
export OPENAI_API_KEY=<your_api_key>

# Run the example
pnpm run start
```

### Updating the tournament

By default, the tournament will run 10 games between `gpt-4o-mini` and the `basic` computer strategy in index.tsx.

#### Players

You can also change the different players in the `index.tsx` file.

There are two computer strategies supported: "random" and "basic".

```tsx
const player2: Player = new Player({
  type: "basic",
});
```

You can use any anthropic model or any openai compatible model.

```tsx
const player1: Player = new Player({
  model: "claude-3-5-haiku-latest",
  type: "llm",
  strategy: "basic",
  provider: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    type: "anthropic",
  },
});
```
