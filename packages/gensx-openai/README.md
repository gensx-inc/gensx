# @gensx/openai

OpenAI integration for [GenSX](https://github.com/gensx-inc/gensx) - Build AI workflows using JSX.

## Installation

```bash
npm install @gensx/openai
```

## Usage

```tsx
import * as gensx from "@gensx/core";
import { OpenAIProvider, ChatCompletion } from "@gensx/openai";

const ChatBot = gensx.Component(async ({ userInput }) => {
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
const StreamingChat = gensx.Component(async ({ userInput }) => {
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY!}>
      <ChatCompletion
        messages={[
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userInput },
        ]}
        model="gpt-4o"
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
