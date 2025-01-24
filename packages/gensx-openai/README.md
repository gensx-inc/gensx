# @gensx/openai

OpenAI integration for [GenSX](https://github.com/gensx-inc/gensx) - Build AI workflows using JSX.

## Installation

```bash
npm install @gensx/openai
```

### Requires `gensx`

This package requires `gensx` to be installed as a peer dependency.

```bash
npm install gensx
```

## Usage

```tsx
import { gsx } from "gensx";
import { OpenAIProvider, OpenAIComponent } from "@gensx/openai";

const ChatBot = gsx.Component(async ({ userInput }) => {
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY!}>
      <ChatCompletion
        messages={[
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userInput },
        ]}
        model="gpt-4o"
        temperature={0.7}
      />
    </OpenAIProvider>
  );
});

// Use with streaming
const StreamingChat = gsx.Component(async ({ userInput }) => {
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY!}>
      <ChatCompletion
        messages={[
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userInput },
        ]}
        stream={true}
      >
        {async (stream) => {
          for await (const token of stream) {
            process.stdout.write(token);
          }
        }}
      </ChatCompletion>
    </OpenAIProvider>
  );
});
```
