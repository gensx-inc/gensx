# @gensx/vercel-ai

Vercel AI SDK for [GenSX](https://github.com/gensx-inc/gensx/packages/gensx-vercel-ai)

## Installation

```bash
npm install @gensx/vercel-ai
```

### Requires `@gensx/core`

This package requires `@gensx/core` to be installed as a peer dependency.

```bash
npm install @gensx/core
```

## Usage

```tsx
import * as gensx from "@gensx/core";
import { generateText, streamText } from "@gensx/vercel-ai";

@Component()
async function ChatBot({ userInput }: { userInput: string }): Promise<string> {
  const result = await generateText({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: userInput },
    ],
    model: "gpt-4o",
    temperature: 0.7,
  });
  return result.text;
}
```
