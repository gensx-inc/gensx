# @gensx/anthropic

A pre-wrapped version of the Anthropic SDK for [GenSX](https://github.com/gensx-inc/gensx). This package provides a simple way to use Anthropic's API with GenSX components.

## Installation

```bash
npm install @gensx/anthropic
```

## Usage

You can use this package in two ways:

### 1. Drop-in Replacement (Recommended)

Simply replace your Anthropic import with the GenSX version:

```ts
// Instead of:
// import { Anthropic } from '@anthropic-ai/sdk';

// Use:
import { Anthropic } from "@gensx/anthropic";

// Create a client as usual
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// All methods are automatically wrapped with GenSX functionality
const completion = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [{ role: "user", content: "Hello!" }],
  max_tokens: 1000,
});

// Use streaming
const stream = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [{ role: "user", content: "Hello!" }],
  max_tokens: 1000,
  stream: true,
});
```

### 2. Wrap an Existing Instance

If you already have an Anthropic instance, you can wrap it with GenSX functionality:

```ts
import { Anthropic } from "@anthropic-ai/sdk";
import { wrapAnthropic } from "@gensx/anthropic";

// Create your Anthropic instance as usual
const client = wrapAnthropic(
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
);

// Now all methods are wrapped with GenSX functionality
const completion = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  messages: [{ role: "user", content: "Hello!" }],
  max_tokens: 1000,
});
```

### 3. Using with GenSX Components

You can also use the package with GenSX components:

```tsx
import * as gensx from "@gensx/core";
import { AnthropicProvider, ChatCompletion } from "@gensx/anthropic";

const ChatBot = gensx.Component(async ({ userInput }) => {
  return (
    <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY!}>
      <ChatCompletion
        system="You are a helpful assistant."
        messages={[{ role: "user", content: userInput }]}
        model="claude-sonnet-4-20250514"
        temperature={0.7}
      />
    </AnthropicProvider>
  );
});

// Use with streaming
const StreamingChat = gensx.Component(async ({ userInput }) => {
  return (
    <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY!}>
      <ChatCompletion
        system="You are a helpful assistant."
        messages={[{ role: "user", content: userInput }]}
        stream={true}
        model="claude-sonnet-4-20250514"
      >
        {async (stream) => {
          for await (const token of stream) {
            process.stdout.write(token);
          }
        }}
      </ChatCompletion>
    </AnthropicProvider>
  );
});
```

## API

The package exports:

1. `Anthropic` - A drop-in replacement for the Anthropic client that automatically wraps all methods with GenSX functionality
2. `wrapAnthropic` - A function to manually wrap an Anthropic instance with GenSX functionality
3. `AnthropicProvider` - A GenSX component for providing Anthropic context
4. `ChatCompletion` - A GenSX component for creating chat completions

All methods from the Anthropic SDK are supported and automatically wrapped with GenSX functionality.

## License

Apache-2.0
