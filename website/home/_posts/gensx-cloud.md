---
title: "GenSX Cloud: infrastructure built for agents"
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

In a few lines we can build a tool for long-term memory using vector search provisioned per-user:

```ts
// Create a per-user memory tool that uses vector search
const createMemoryTool = (userId) => {
  const memoryTool = new GSXTool({
    name: "searchMemory",
    description: "Search the user's long-term memory for relevant information",
    schema: memorySearchSchema,
    run: async ({ query }) => {
      // Provisioned on-demand for each user in milliseconds
      const memory = await useSearch(`memory-${userId}`);
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });

      // Search for relevant memories
      const results = await memory.query({
        vector: embedding.data[0].embedding,
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful personal assistant" },
        ...chatHistory,
        { role: "user", content: message },
      ],
      tools: [searchMemoryTool, addMemoryTool],
    });

    // Update and save conversation history
    chatHistory.push({ role: "user", content: message });
    chatHistory.push({ role: "assistant", content: response });
    await saveChatHistory(userId, threadId, chatHistory);

    return response;
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

Dashboard: https://app.gensx.com/gensx/your-project/default/workflows
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
  "https://api.gensx.com/org/gensx/projects/your-project/environments/default/workflows/ChatAgent" \
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
  "https://api.gensx.com/org/gensx/projects/your-project/environments/default/workflows/ChatAgent/start" \
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

## Start building agents for free

We've solved the hard infrastructure problems so you don't have to. The future of AI isn't just about better models—it's about enabling engineers to build reliable applications with them.

GenSX Cloud comes with a generous free tier, and a reasonable pricing model for teams that grows with you:

- **Free tier** for individuals: 50K compute seconds/month, 5-minute maximum execution time, 500MB storage
- **Pro tier** ($20/dev/month): 500K compute seconds/month, 60-minute maximum execution time, and larger storage allocations

We charge for overages if you consume more than your included resources, but the pricing is transparent and predictable—no surprise bills at the end of the month. For more details see the full [GenSX Cloud pricing page](http:///docs/cloud/pricing).

[Give GenSX Cloud a try](http:///docs/quickstart). The free tier has everything you need to build and deploy your first production-ready agent. Checkout the open source [GenSX project on GitHub](https://github.com/gensx-inc/gensx) and join our [community of AI engineers on Discord](https://discord.gg/wRmwfz5tCy).
