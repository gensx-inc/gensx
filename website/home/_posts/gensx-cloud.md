---
title: "GenSX Cloud: infrastructure designed for agents"
date: "2025-06-23T00:00:00.000Z"
coverImage: "/assets/blog/hello-world/cover.jpg"
author:
  name: Evan Boyle
  picture: "/assets/blog/authors/evan.jpg"
ogImage:
  url: "/assets/blog/hello-world/cover.jpg"
---

# Today we’re launching GenSX Cloud

Today we’re introducing GenSX Cloud in developer beta. It is a serverless platform for deploying agents and workflows on a full [Node.js](http://Node.js) runtime with a 60 minute timeout, an order of magnitude longer than existing serverless compute providers.

GenSX Cloud also comes with storage primitives for building agents including blobs, vector search, and SQL databases. All of this can be provisioned dynamically at runtime in just a few milliseconds, meaning that agents can create their own storage on the fly as they need it. This enables a lot of interesting patterns like creating a request-scoped SQL database to power text to sql queries over a CSV, or per-user vector indices for long-term memory.

When we first started building agents, we were surprised by how fast we graduated off of existing serverless providers. It is really easy to build agents or LLM workflows that take multiple minutes. We wanted to build a compute platform that had the productive developer experience of serverless, without the runtime limitations that require replatforming when you hit the five minute runtime mark.

GenSX workflows are just plain TypeScript functions that our build tools convert into REST APIs with both sync and async endpoints. Workflows are composed of components, also just plain functions, that serve as a boundary for testing and sharing code, tracing inputs and outputs, and error handling and retries.

In a few lines we can build a tool for long-term memory using vector search provisioned per-user:

```ts
// Create a per-user memory tool that uses vector search
const createMemoryTool = (userId) => {
  const memoryTool = tool({
    description: "Search the user's long-term memory for relevant information",
    parameters: z.object({
      query: z.string().describe("the search query"),
    }),
    execute: async ({ query }) => {
      // Provisioned on-demand for each user in milliseconds
      const memory = await useSearch(`memory-${userId}`);
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: query,
      });

      // Search for relevant memories
      const results = await memory.query({
        vector: embedding,
        topK: 3,
      });

      return {
        memories: results.map((m) => m.text),
      };
    },
  });

  return memoryTool;
};
```

And we can add blob storage to save and retrieve previous messages per-thread and per-user:

```ts
// Chat history persistence using blobs
const getChatHistory = async (userId, threadId) => {
  // Automatically organized by user and conversation
  const blob = useBlob(`chats/${userId}/${threadId}.json`);
  return (await blob.getJSON()) ?? [];
};

const saveChatHistory = async (userId, threadId, history) => {
  const blob = useBlob(`chats/${userId}/${threadId}.json`);
  await blob.putJSON(history);
};
```

Combining it all together we have a stateful agent with chat history and long-term per-user memory:

```ts
// Complete agent with memory and chat history
const MemoryEnabledAgent = gensx.Component(
  "ChatAgent",
  async ({ userId, threadId, message }) => {
    // Get chat history from blob storage
    const chatHistory = await getChatHistory(userId, threadId);

    // Create memory search tool for this user
    const { searchMemoryTool, addMemoryTool } = createMemoryTools(userId);

    // Run the chat completion with memory tool access
    const response = await generateText({
      model: openai("gpt-4o"),
      messages: [
        { role: "system", content: "You are a helpful personal assistant" },
        ...chatHistory,
        { role: "user", content: message },
      ],
      tools: { searchMemoryTool, addMemoryTool },
    });

    // Update and save conversation history
    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: response.text });
    await saveChatHistory(userId, threadId, chatHistory);

    return response.text;
  },
);
```

With one command we can deploy this agent as a REST API running on serverless infrastructure with 60 minute execution timeouts.

```console
$ npx gensx deploy ./src/workflows.tsx
```

And just like that, each workflow in your project is deployed as a set of REST APIs. Each workflow includes a standard `POST` endpoint for synchronous and streaming invocations to power user-facing apps as well as a `/start` endpoint for long-running background jobs.

```console
✔ Building workflow using Docker
✔ Generating schema
✔ Successfully deployed project to GenSX Cloud

Available workflows:
- ChatAgent
- TextToSQLWorkflow
- RAGWorkflow

Dashboard: https://app.gensx.com/your-org/your-project/default/workflows
```

And we can run our talk to our agent from the CLI:

```console
$ gensx run ChatAgent \
  --input '{
    "userId": "abc",
    "threadId": "123",
    "message": "what time is my appointment on monday?"
  }'
```

We can call the API directly and stream results:

```console
$ curl -X POST \
  "https://api.gensx.com/org/your-org/projects/your-project/environments/default/workflows/ChatAgent" \
  -H "Authorization: Bearer your_gensx_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "abc",
    "threadId": "123",
    "message": "what time is my appointment on monday?"
  }'
```

And if this workflow happened to take a long time, we can call it as a background job and poll for results later:

```console
$ curl -X POST \
  "https://api.gensx.com/org/your-org/projects/your-project/environments/default/workflows/ChatAgent/start" \
  -H "Authorization: Bearer your_gensx_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "abc",
    "threadId": "123",
    "message": "what time is my appointment on monday?"
  }'
```

We can even connect it to MCP compatible tools like Claude desktop or cursor:

```json
{
  "mcpServers": {
    "gensx": {
      "command": "npx",
      "args": [
        "-y",
        "@gensx/gensx-cloud-mcp",
        "my-org",
        "my-project",
        "my-environment"
      ]
    }
  }
}
```

Anytime our workflow runs, we get traces showing inputs, outputs, token usage, and timing of every component making it easy to debug and understand LLM quality:

![Workflow tracing](/assets/blog/gensx-cloud/tracing.png)

GenSX includes a ton of other tools to make the process of shipping agents delightful and productive, including a local development server (`gensx start`), and durable streams that let agents and workflows publish intermediate progress as they execute in an async context.

Whether you are just getting started with simple chat bots, or building long-running deep research agents, GenSX Cloud provides the compute, storage, and tracing that you need to carry you from day one to day 1000 of your AI development lifecycle.

## Comparing other serverless providers

The previous generation of serverless infra was designed for API servers and serving web pages. Agents have a fundamentally different set of requirements. They are dynamic, and they can run for a very long time. We designed GenSX cloud around these requirements:

| Platform           | Max Wall Clock Time     | Runtime-Provisioned Storage     | Start/Poll for Long Jobs | Cold Start Times        | Notable Limitations                     |
| ------------------ | ----------------------- | ------------------------------- | ------------------------ | ----------------------- | --------------------------------------- |
| **GenSX Cloud**    | **60 minutes**          | **Blobs, Vectors, SQL (<10ms)** | **Built-in**             | **~100ms (every call)** | —                                       |
| AWS Lambda         | 15 minutes              | No                              | Limited (Step Functions) | 200–500ms               | Requires replatforming for longer jobs  |
| Vercel Functions   | 15 minutes (Enterprise) | No                              | No                       | 250–400ms               | No native long-running job support      |
| Cloudflare Workers | 5 minutes CPU time      | Pre-provisioned KV/R2/D1        | No                       | <10ms                   | Max 1000 HTTP subrequests per execution |

The 60 minute timeouts on GenSX are just a temporary intermediate state as we work on delivering support for durable workflows. In the coming months, workflows will be able to pause, wait for human input, and run for days or even weeks.

## Start building agents for free

We've solved the hard infrastructure problems so you don't have to. The future of AI isn't just about better models—it's about enabling engineers to build reliable applications with them.

GenSX Cloud comes with a generous free tier, and a reasonable pricing model for teams that grows with you:

- **Free tier** for individuals: 50K compute seconds/month, 5-minute maximum execution time, 500MB storage
- **Pro tier** ($20/dev/month): 500K compute seconds/month, 60-minute maximum execution time, and larger storage allocations

We charge for overages if you consume more than your included resources, but the pricing is transparent and predictable—no surprise bills at the end of the month. For more details see the full [GenSX Cloud pricing page](http:///docs/cloud/pricing).

## Just the beginning

Our goal is to make building bleeding-edge agents dead simple. Today, building something like deep research, or codex-like experiences that dispatch background agents is extremely hard.

We believe this is where the future is going: agents that are always on, running around the clock, transparent about what they are working on, and ready to receive feedback to course correct.

This initial release of GenSX Cloud is just a small first step towards that future. In the coming weeks we're excited to share more on:

- **Durable streams and react integration** for building rich UX against background agents against strongly typed events and state
- **Human in the loop** - agents that can pause and seek feedback from humans and external systems
- **Durable workflows** - workflows that are automatically resilient to failure, can run for days, pause/resume, and even time travel
- **Front-end tool calling** for agents need to manipulate and query front-end applications

[Give GenSX Cloud a try](http:///docs/quickstart). The free tier has everything you need to build and deploy your first production-ready agent. Checkout the open source [GenSX project on GitHub](https://github.com/gensx-inc/gensx) and join our [community of AI engineers on Discord](https://discord.gg/wRmwfz5tCy).
