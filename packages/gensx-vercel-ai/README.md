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

## Using Frontend Tools with GenSX ToolBox

This package provides utilities to convert GenSX ToolBox definitions to Vercel AI SDK ToolSet format for use with AI models.

### Converting ToolBox to ToolSet

```tsx
import { createToolBox } from "@gensx/core";
import { asToolSet, addAsToolSetMethod } from "@gensx/vercel-ai";
import { generateText } from "@gensx/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v4";

// Define a ToolBox using GenSX's createToolBox
const myToolBox = createToolBox({
  weather: {
    params: z.object({
      location: z.string().describe("The location to get weather for"),
    }),
    result: z.object({
      temperature: z.number(),
      condition: z.string(),
    }),
  },
});

const toolSet = asToolSet(myToolBox);

// Use with Vercel AI SDK
const result = await generateText({
  messages: [
    {
      role: "system",
      content: "You are a helpful assistant that can use tools.",
    },
    { role: "user", content: "What's the weather like in Seattle?" },
  ],
  model: openai("gpt-4o-mini"),
  tools: toolSet, // Use the converted ToolSet
});
```

The `asToolSet` function converts GenSX ToolBox definitions to Vercel AI SDK Tool format, automatically handling the integration with GenSX's `executeExternalTool` function for proper workflow execution.
