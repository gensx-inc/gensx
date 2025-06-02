# GenSX ⚡️

[![npm version](https://badge.fury.io/js/gensx.svg)](https://badge.fury.io/js/gensx)
[![Website](https://img.shields.io/badge/Visit-gensx.com-orange)](https://gensx.com)
[![Discord](https://img.shields.io/badge/Join-Discord-5865F2)](https://discord.gg/wRmwfz5tCy)
[![X](https://img.shields.io/badge/Follow-X-black)](https://x.com/gensx_inc)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[GenSX](https://gensx.com/) is a simple TypeScript framework for building complex LLM applications. It's a workflow engine designed for building agents, chatbots, and long-running workflows.

## Why GenSX?

- 🎯 **Pure Functions**: Components are pure TypeScript functions that are easily testable, reusable, and sharable
- 🌴 **Natural Composition**: Building workflows is as simple as composing functions together
- 🔒 **Type-safe**: Full TypeScript support with no DSLs or special syntax - just standard language features
- 🚀 **Built for Scale**: Start simple and evolve to complex patterns like agents and reflection without changing your programming model
- 📊 **Automatic Tracing**: Real-time tracing of all component inputs/outputs, tool calls, and LLM calls making debugging and observability easy
- ☁️ **One-Click Deployment**: Deploy workflows as REST APIs with a single command, optimized for long-running LLM workloads up to 60 minutes
- 💾 **Built-in Storage**: Zero-config blob storage, SQL databases, and vector search for building stateful agents and workflows

Check out the [documentation](https://gensx.com/docs) to learn more about building LLM applications with GenSX.

## Building a workflow

Most LLM frameworks are graph oriented--you express your workflow with nodes, edges, and a global state object. GenSX takes a different approach--you compose your workflow with components, and GenSX handles the execution for you.

Components in GenSX look a lot like functions. You create them by passing in a function and a name to `gensx.Component()`, a higher order function::

```tsx
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
    Use the information when responding to users: ${research}`;

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

```tsx
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

## Getting Started

Check out the [Quickstart Guide](https://gensx.com/docs/quickstart) to build your first workflow in just a few minutes.

## Examples

This repo contains a number of [examples](./examples) to help you get up and running with GenSX.

To run an example:

```bash
cd examples/<example-name>

pnpm install

pnpm start
```

### Basic Examples

| Example                                                | Description                                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 🔄 [Reflection](./examples/reflection)                 | Shows how to use a self-reflection pattern with GenSX                                                    |
| 🦾 [Anthropic Examples](./examples/anthropic-examples) | Examples showing how to use [@gensx/anthropic](https://www.gensx.com/docs/component-reference/anthropic) |
| 🧠 [OpenAI Examples](./examples/openai-examples)       | Examples showing how to use [@gensx/openai](https://www.gensx.com/docs/component-reference/openai)       |
| 🌊 [Vercel AI SDK Examples](./examples/vercel-ai)      | Examples showing how to use [@gensx/vercel-ai](https://www.gensx.com/docs/component-reference/vercel-ai) |

### Full Examples

| Example                                                    | Description                                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 🔍 [Hacker News Analyzer](./examples/hacker-news-analyzer) | Analyzes HN posts and generates summaries and trends using Paul Graham's writing style       |
| ✍️ [Blog Writer](./examples/blog-writer)                   | Generates blogs through an end-to-end workflow including topic research and content creation |
| 🔬 [Deep Research](./examples/deep-research)               | Generates a report from a prompt after researching and summarizing a list of research papers |
| 💻 [Computer Use](./examples/openai-computer-use)          | Demonstrates how to use the OpenAI computer use tool with GenSX                              |
| 🗄️ [Text to SQL](./examples/text-to-sql)                   | Shows how to use database storage to translate natural language to SQL queries               |
| 🔎 [RAG](./examples/rag)                                   | Demonstrates retrieval augmented generation using vector search storage                      |
| 💬 [Chat Memory](./examples/chat-memory)                   | Shows how to build a chat application with persistent chat history using blob storage        |

## Working with this repo

This monorepo contains GenSX, its related packages, examples, and documentation. You can find more detailed instructions in [CONTRIBUTING.md](./CONTRIBUTING.md).

### Repository Structure

- `packages/` - Published packages
- `examples/` - Example applications and use cases
- `website/` - [GenSX website](https://gensx.com)

## License

[Apache 2.0](./LICENSE)
