# GenSX ⚡️

GenSX is a framework for building LLM workflows and AI agents with TypeScript. Every GenSX component is a pure function, and thus easily shareable by default.

## Getting started

### 📦 Installing

```bash
pnpm install @gensx/core
```

```bash
yarn add @gensx/core
```

```bash
npm install @gensx/core
```

## Building a workflow

```ts
import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "@gensx/vercel-ai";

// input interface
interface WriteDraftInput {
  research: string[];
  prompt: string;
}

// components are pure functions that are reusable by default
const WriteDraft = gensx.Component(
  "WriteDraft",
  async ({ prompt, research }: WriteDraftInput) => {
    const systemMessage = `You're an expert technical writer.
    Use the information when responding to users: ${research.join("\n")}`;

    const result = await generateText({
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: `Write a blog post about ${prompt}`,
        },
      ],
      model: openai("gpt-4.1-mini"),
    });

    return result.text;
  },
);
```

Components can be composed together to create more complex agents and workflows:

```ts
import * as gensx from "@gensx/core";
import { OpenAIProvider } from "gensx/openai";
import { Research, WriteDraft, EditDraft } from "./writeBlog";

interface WriteBlogInput {
  title: string;
  description: string;
}

const WriteBlog = gensx.Workflow(
  "WriteBlog",
  async ({ title, description }: WriteBlogInput) => {
    const queries = await GenerateQueries({
      title,
      description,
    });
    const research = await ResearchBlog({ queries });
    const draft = await WriteDraft({ title, context: research });
    const final = await EditDraft({ title, content: draft });
    return final;
  },
);

const result = await WriteBlog({
  title: "How AI broke modern infra",
  description: "Long-running workflows require a new approach to infra",
});
```
