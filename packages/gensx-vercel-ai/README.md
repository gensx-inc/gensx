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
import { generateText } from "@gensx/vercel-ai";
import { openai } from "@ai-sdk/openai";

export const BasicChat = gensx.Workflow(
  "BasicChat",
  async ({ userInput }: { userInput: string }): Promise<string> => {
    const result = await generateText({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userInput },
      ],
      model: openai("gpt-4.1-mini"),
    });
    return result.text;
  },
);
```

## Using Frontend Tools with GenSX ToolBox

This package provides utilities to convert GenSX ToolBox definitions to Vercel AI SDK ToolSet format for use with AI models.

### Converting ToolBox to ToolSet

```tsx
import { createToolBox } from "@gensx/core";
import { asToolSet } from "@gensx/vercel-ai";
import { generateText } from "@gensx/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

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
  model: openai("gpt-4.1-mini"),
  tools: toolSet, // Use the converted ToolSet
});
```

The `asToolSet` function converts GenSX ToolBox definitions to Vercel AI SDK Tool format, automatically handling the integration with GenSX's `executeExternalTool` function for proper workflow execution.

## Available Functions

This package provides many of the functions available in the [Vercel AI SDK](https://vercel.com/docs/ai-sdk).

- **`generateText`** - Generate text responses from AI models
- **`streamText`** - Stream text responses in real-time
- **`generateObject`** - Generate structured JSON objects with schema validation
- **`streamObject`** - Stream structured JSON objects in real-time
- **`embed`** - Generate embeddings for text
- **`embedMany`** - Generate embeddings for multiple texts
- **`generateImage`** - Generate images from text prompts
