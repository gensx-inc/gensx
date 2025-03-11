# GenSX ⚡️

[![npm version](https://badge.fury.io/js/gensx.svg)](https://badge.fury.io/js/gensx)
[![Website](https://img.shields.io/badge/Visit-gensx.com-orange)](https://gensx.com)
[![Discord](https://img.shields.io/badge/Join-Discord-blue)](https://discord.gg/wRmwfz5tCy)
[![X](https://img.shields.io/badge/Follow-X-blue)](https://x.com/gensx_inc)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[GenSX](https://gensx.com/) is a simple typescript framework for building agents and workflows with reusable React-like components.

GenSX takes a lot of inspiration from React, but the programming model is very different - it’s a Node.js framework designed for data flow.

But if you know how to write a react component, then building an agent will feel easy and familiar.

## Why GenSX?

- 🎯 **Pure Functions**: Components are pure TypeScript functions that are easily testable, reusable, and sharable
- 🌴 **Natural Composition**: Chain LLM calls using JSX - a familiar, visual syntax that reads top-to-bottom like normal code
- ⚡️ **Parallel by Default**: Components execute in parallel when possible while maintaining dependencies
- 🔒 **Type-safe**: Full TypeScript support with no DSLs or special syntax - just standard language features
- 🌊 **Streaming Built-in**: Stream responses with a single prop change, no refactoring needed
- 🚀 **Built for Scale**: Start simple and evolve to complex patterns like agents and reflection without changing your programming model

Check out the [documentation](https://gensx.com/docs) to learn more about building LLM applications with GenSX.

## Building a workflow

Most LLM frameworks are graph oriented--you express your workflow with nodes, edges, and a global state object. GenSX takes a different approach--you compose your workflow with components, and GenSX handles the execution for you.

Components in GenSX look a lot like a React components:

```tsx
import * as gensx from "@gensx/core";
import { ChatCompletion } from "gensx/openai";

// props interface
interface WriteDraftProps {
  research: string[];
  prompt: string;
}

// return type
type WriteDraftOutput = string;

// components are pure functions that are reusable by default
const WriteDraft = gensx.Component<WriteDraftProps, WriteDraftOutput>(
  "WriteDraft",
  ({ prompt, research }) => {
    const systemMessage = `You're an expert technical writer.
    Use the information when responding to users: ${research}`;

    return (
      <ChatCompletion
        model="gpt-4o-mini"
        temperature={0}
        messages={[
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: `Write a blog post about ${prompt}`,
          },
        ]}
      />
    );
  },
);
```

Components can be composed together to create more complex agents and workflows:

```tsx
import * as gensx from "@gensx/core";
import { OpenAIProvider } from "gensx/openai";
import { Research, WriteDraft, EditDraft } from "./writeBlog";

interface BlogWriterProps {
  prompt: string;
}

export const WriteBlog = gensx.StreamComponent<BlogWriterProps>(
  "WriteBlog",
  ({ prompt }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <Research prompt={prompt}>
          {(research) => (
            <WriteDraft prompt={prompt} research={research.flat()}>
              {(draft) => <EditDraft draft={draft} stream={true} />}
            </WriteDraft>
          )}
        </Research>
      </OpenAIProvider>
    );
  },
);

const workflow = gensx.Workflow("WriteBlogWorkflow", WriteBlog);
const result = await workflow.run({
  prompt: "Write a blog post about AI developer tools",
});
```

## Getting Started

Check out the [Quickstart Guide](https://gensx.com/docs/quickstart) to build your first workflow in just a few minutes.

## Examples

This repo contains a number of [examples](./examples) to help you get up and running with GenSX.

Running an example:

```bash
# From the root of the repo

# Install dependencies
pnpm install

# Run the example
pnpm start:example <example-name>
```

### Basic Examples

| Example                                                 | Description                                                      |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| 📊 [Structured Outputs](./examples/structuredOutputs)   | Shows how to use structured outputs with GenSX                   |
| 🔄 [Reflection](./examples/reflection)                  | Shows how to use a self-reflection pattern with GenSX            |
| 🌊 [Streaming](./examples/streaming)                    | Shows how to handle streaming responses with GenSX               |
| 🗃️ [Contexts](./examples/contexts)                      | Shows how to use contexts to manage state in GenSX               |
| 🔌 [Providers](./examples/providers)                    | Shows how to create a custom provider for GenSX                  |
| 🎭 [Nested Providers](./examples/nestedProviders)       | Demonstrates how to nest and combine multiple providers in GenSX |
| 🧩 [Reusable Components](./examples/reusableComponents) | Shows how to create and use reusable components in GenSX         |

### Full Examples

| Example                                                  | Description                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 🔍 [Hacker News Analyzer](./examples/hackerNewsAnalyzer) | Analyzes HN posts and generates summaries and trends using Paul Graham's writing style       |
| ✍️ [Blog Writer](./examples/blogWriter)                  | Generates blogs through an end-to-end workflow including topic research and content creation |
| 🔬 [Deep Research](./examples/deepResearch)              | Generates a report from a prompt after researching and summarizing a list of research papers |

## Working with this repo

This monorepo contains GenSX, its related packages, examples, and documentation. You can find more detailed instructions in [CONTRIBUTING.md](./CONTRIBUTING.md).

### Repository Structure

- `packages/` - Published packages
- `examples/` - Example applications and use cases
- `website/` - [GenSX website](https://gensx.com)

## License

[Apache 2.0](./LICENSE)
