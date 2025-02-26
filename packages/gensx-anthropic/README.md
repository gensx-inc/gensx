# @gensx/anthropic

Anthropic integration for [GenSX](https://github.com/gensx-inc/gensx) - Build AI workflows using JSX.

## Installation

```bash
npm install @gensx/anthropic
```

## Usage

```tsx
import { gsx } from "gensx";
import { AnthropicProvider, ChatCompletion } from "@gensx/anthropic";

const ChatBot = gsx.Component(async ({ userInput }) => {
  return (
    <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY!}>
      <ChatCompletion
        system="You are a helpful assistant."
        messages={[
          { role: "user", content: userInput },
        ]}
        model="claude-3-5-sonnet-latest"
        temperature={0.7}
      />
    </AnthropicProvider>
  );
});

// Use with streaming
const StreamingChat = gsx.Component(async ({ userInput }) => {
  return (
    <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY!}>
      <ChatCompletion
        system="You are a helpful assistant."
        messages={[
          { role: "user", content: userInput },
        ]}
        stream={true}
        model="claude-3-5-sonnet-latest"
      >
        {async (stream) => {
          for await (const token of stream) {
            process.stdout.write(token);
          }
        }}
      </AnthropicProvider>
    </OpenAIProvider>
  );
});
```
