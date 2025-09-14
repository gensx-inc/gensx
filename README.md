# GenSX ⚡️

[![npm version](https://badge.fury.io/js/gensx.svg)](https://badge.fury.io/js/gensx)
[![Website](https://img.shields.io/badge/Visit-gensx.com-orange)](https://gensx.com)
[![Discord](https://img.shields.io/badge/Join-Discord-5865F2)](https://discord.gg/wRmwfz5tCy)
[![X](https://img.shields.io/badge/Follow-X-black)](https://x.com/gensx_inc)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[GenSX](https://gensx.com/) is a simple TypeScript framework for building complex LLM applications. It's a workflow engine designed for building agents, chatbots, and long-running workflows.

## Table of Contents

- [Why GenSX?](#why-gensx)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Building a Workflow](#building-a-workflow)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Community & Support](#community--support)
- [Development](#development)
- [License](#license)

## Why GenSX?

- 🎯 **Pure Functions**: Components are pure TypeScript functions that are easily testable, reusable, and sharable
- 🌴 **Natural Composition**: Building workflows is as simple as composing functions together
- 🔒 **Type-safe**: Full TypeScript support with no DSLs or special syntax - just standard language features
- 🚀 **Built for Scale**: Start simple and evolve to complex patterns like agents and reflection without changing your programming model
- 📊 **Automatic Tracing**: Real-time tracing of all component inputs/outputs, tool calls, and LLM calls making debugging and observability easy
- ☁️ **One-Click Deployment**: Deploy workflows as REST APIs with a single command, optimized for long-running LLM workloads up to 60 minutes
- 💾 **Built-in Storage**: Zero-config blob storage, SQL databases, and vector search for building stateful agents and workflows

Check out the [documentation](https://gensx.com/docs) to learn more about building LLM applications with GenSX.

## Installation

### Prerequisites

- Node.js 18+ (Node.js 20+ recommended)
- npm, pnpm, or yarn

### Create a new project

The fastest way to get started is with `create-gensx`:

```bash
npx create-gensx@latest my-workflow
cd my-workflow
npm install
```

### Add to existing project

```bash
# Using npm
npm install gensx @gensx/core

# Using pnpm
pnpm add gensx @gensx/core

# Using yarn
yarn add gensx @gensx/core
```

### Install AI SDK packages

Choose your preferred AI provider:

```bash
# OpenAI
npm install @gensx/openai

# Anthropic
npm install @gensx/anthropic

# Vercel AI SDK
npm install @gensx/vercel-ai
```

## Quick Start

Here's a simple example to get you started:

```typescript
import * as gensx from "@gensx/core";
import { OpenAI } from "@gensx/openai";

// Create a simple completion component
const SimpleChat = gensx.Component(
  "SimpleChat",
  async ({ message }: { message: string }) => {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });

    return response.choices[0].message.content;
  },
);

// Create a workflow that uses the component
const ChatWorkflow = gensx.Workflow(
  "ChatWorkflow",
  async ({ userMessage }: { userMessage: string }) => {
    const response = await SimpleChat({ message: userMessage });
    return { response };
  },
);

// Run the workflow
const result = await ChatWorkflow({ userMessage: "Hello, world!" });
console.log(result.response);
```

For more detailed instructions, check out the [Quickstart Guide](https://gensx.com/docs/quickstart).

## Building a Workflow

Most LLM frameworks are graph oriented--you express your workflow with nodes, edges, and a global state object. GenSX takes a different approach--you compose your workflow with components, and GenSX handles the execution for you.

Components in GenSX look a lot like functions. You create them by passing in a function and a name to `gensx.Component()`, a higher order function:

```tsx
import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "@gensx/vercel-ai";

// Input interface for type safety
interface WriteDraftInput {
  research: string[];
  prompt: string;
}

// Components are pure functions that are reusable by default
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
      model: openai("gpt-4o-mini"),
    });

    return result.text;
  },
);
```

Components can be composed together to create more complex agents and workflows:

```tsx
import * as gensx from "@gensx/core";
import { Research, WriteDraft, EditDraft, GenerateQueries } from "./components";

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
    const research = await Research({ queries });
    const draft = await WriteDraft({ prompt: title, research });
    const final = await EditDraft({ title, content: draft });
    return final;
  },
);

const result = await WriteBlog({
  title: "How AI broke modern infra",
  description: "Long-running workflows require a new approach to infra",
});
```

## API Reference

### Core Components

#### `gensx.Component(name, fn)`

Creates a reusable component that can be traced and composed.

```typescript
const MyComponent = gensx.Component("MyComponent", async (input) => {
  // Your logic here
  return output;
});
```

#### `gensx.Workflow(name, fn)`

Creates a workflow that orchestrates multiple components.

```typescript
const MyWorkflow = gensx.Workflow("MyWorkflow", async (input) => {
  const step1 = await Component1(input);
  const step2 = await Component2(step1);
  return step2;
});
```

### AI Provider Packages

| Package            | Description               | Installation                   |
| ------------------ | ------------------------- | ------------------------------ |
| `@gensx/openai`    | OpenAI SDK wrapper        | `npm install @gensx/openai`    |
| `@gensx/anthropic` | Anthropic SDK wrapper     | `npm install @gensx/anthropic` |
| `@gensx/vercel-ai` | Vercel AI SDK integration | `npm install @gensx/vercel-ai` |

### Storage & Utilities

| Package          | Description                   | Installation                 |
| ---------------- | ----------------------------- | ---------------------------- |
| `@gensx/storage` | Blob, SQL, and vector storage | `npm install @gensx/storage` |
| `@gensx/react`   | React components and hooks    | `npm install @gensx/react`   |
| `@gensx/client`  | Client SDK for REST APIs      | `npm install @gensx/client`  |

For complete API documentation, visit [gensx.com/docs](https://gensx.com/docs).

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

## Community & Support

- 📚 **Documentation**: [gensx.com/docs](https://gensx.com/docs)
- 💬 **Discord**: [Join our community](https://discord.gg/wRmwfz5tCy) for help and discussions
- 🐛 **Issues**: [Report bugs](https://github.com/gensx-inc/gensx/issues) or request features
- 💡 **Discussions**: [GitHub Discussions](https://github.com/gensx-inc/gensx/discussions) for questions and ideas
- 🐦 **Twitter/X**: [@gensx_inc](https://x.com/gensx_inc) for updates and announcements

## Development

### Working with this Repository

This monorepo contains GenSX, its related packages, examples, and documentation. You can find more detailed instructions in [CONTRIBUTING.md](./CONTRIBUTING.md).

#### Repository Structure

```
gensx/
├── packages/           # Published packages
│   ├── gensx/         # Main CLI and orchestration
│   ├── gensx-core/    # Core framework
│   ├── gensx-openai/  # OpenAI integration
│   ├── gensx-anthropic/ # Anthropic integration
│   ├── gensx-vercel-ai/ # Vercel AI SDK integration
│   ├── gensx-storage/ # Storage utilities
│   └── ...            # Other packages
├── examples/          # Example applications and use cases
├── website/           # Documentation and marketing site
└── ...
```

#### Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

#### Key Commands

- `pnpm dev` - Watch and build packages during development
- `pnpm build:examples` - Build example projects
- `pnpm test:examples` - Run example tests
- `pnpm clean` - Clean build artifacts

### Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to get started.

## License

[Apache 2.0](./LICENSE)
