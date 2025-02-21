# @gensx/ai-sdk

AI SDK for [GenSX](https://github.com/gensx-inc/gensx)

## Installation

```bash
npm install @gensx/ai-sdk
```

### Requires `gensx`

This package requires `gensx` to be installed as a peer dependency.

```bash
npm install gensx
```

## Usage

```tsx
import { gsx } from "gensx";
import { GenerateText, StreamText } from "@gensx/ai-sdk";

const ChatBot = gsx.Component(async ({ userInput }) => {
  return (
    <GenerateText
      messages={[
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userInput },
      ]}
      model="gpt-4o"
      temperature={0.7}
    />
  );
});

// Use with streaming
const StreamingChat = gsx.Component(async ({ userInput }) => {
  return (
    <StreamText
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
    </StreamText>
  );
});
```
