---
title: "GenSX Cloud: purpose-built infrastructure for agentic workloads"
date: "2025-04-18T00:00:00.000Z"
coverImage: "/assets/blog/hello-world/cover.jpg"
author:
  name: Evan Boyle
  picture: "/assets/blog/authors/evan.jpg"
ogImage:
  url: "/assets/blog/hello-world/cover.jpg"
---

## Today we're launching GenSX Cloud

Today we're launching [GenSX Cloud](https://gensx.com/docs/cloud), the fastest path from prototype to production for your agents and workflows. One command turns your TypeScript code into production APIs with built-in cloud storage, observability, and support for long-running executions.

It includes:

1. **Serverless runtime**: `gensx deploy` turns all of your TypeScript workflows into REST APIs deployed on serverless infrastructure. A novel architecture that enables 10ms cold starts and supports long-running execution up to 60 minutes per request.
2. **Cloud storage**: runtime hooks for provisioning blob storage, SQL databases, and vector and full-text search indexes in milliseconds for any agent that needs it.
3. **Tracing and observability**: Automatic tracing of every workflow. Flame graphs of every workflow showing full component inputs and outputs at each step.

In a few lines we can build a tool for long-term memory using vector search provisioned per-user:

```tsx
// Create a per-user memory tool that uses vector search
const createMemoryTool = (userId) => {
  const memoryTool = new GSXTool({
    name: "searchMemory",
    description: "Search the user's long-term memory for relevant information",
    schema: memorySearchSchema,
    run: async ({ query }) => {
      // Provisioned on-demand for each user in milliseconds
      const memory = await useSearch(`memory-${userId}`);
      const embedding = await OpenAIEmbedding.run({
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

```tsx
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

```tsx
// Complete agent with memory and chat history
const MemoryEnabledAgent = gensx.Component(
  "ChatAgent",
  async ({ userId, threadId, message }) => {
    // Get chat history from blob storage
    const chatHistory = await getChatHistory(userId, threadId);

    // Create memory search tool for this user
    const { searchMemoryTool, addMemoryTool } = createMemoryTools(userId);

    // Run the chat completion with memory tool access
    const response = await ChatCompletion.run({
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

With one command we can deploy this agent as a REST API running on serverless infrastructure with 10ms cold starts 60 minute execution timeouts.

```bash
$ npx gensx deploy ./src/workflows.tsx
```

And just like that, each workflow in your project is deployed as a set of REST APIs. Each workflow includes a standard `POST` endpoint for synchronous and streaming invocations to power user-facing apps as well as a `/start` endpoint for long-running background jobs.

```
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

```bash
$ gensx run ChatAgent \
  --input '{
    "userId": "abc",
    "threadId": "123",
    "message": "what time is my appointment on monday?"
  }'
```

We can call the API directly and stream results:

```bash
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

```bash
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

On the surface, it would appear that deploying AI to production is a solved problem. There have to be at least 50+ startups who say you can do it in one line of code. It seems like there's a new one on ShowHN every day. And yet, if you talk to AI engineers actually trying to do this, you'll get a different story. The thing is that it's pretty easy to make anything one line of code…but what's under that line?

## How agents broke our assumptions about infra

I've spent a significant part of my career building and deploying infrastructure at scale — five years as an early employee at Pulumi, working on search in the early days of Azure, and operating services at scale at Amazon. I understand infrastructure as code. I've written a hundred thousand of lines of IaC, authored Kubernetes operators, and scaled services to the moon.

But AI agent workloads contradict everything I've ever learned about infrastructure. Agent infrastructure is _dynamic_, and agentic workloads run for a _very long time_ relative to the traditional workloads we're used to operating from web 2.0. These violations of our priors require rethinking the way we approach infrastructure.

### Static vs ephemeral storage

Infrastructure for traditional web apps is mostly static. You provision resources once, scale them occasionally, and they serve millions of stateless HTTP requests. The infrastructure and application layers are cleanly separated.

Agent workloads flip this model on its head. They need:

1. **Per-user or per-workflow storage**: Each conversation thread, each agent instance, each data processing task might need its own isolated storage.

2. **Physical isolation for security**: When AI generates queries against data, multi-tenant storage becomes a security risk. You need dedicated resources per user or request, not just logical separation. And runtime provisioning needs to happen in milliseconds and not minutes.

3. **Ephemeral, request-scoped resources**: An agent processing a user's CSV needs a database right now, not in 5 minutes after your IaC workflow runs.

4. **Storage as part of application code**: Your business logic and storage provisioning are tightly coupled, not separate deployment steps. Agentic workloads need hooks to provision storage dynamically at runtime.

Writing separate YAML files or running terraform apply every time an agent needs a database is simply unworkable. The state explosion problem is real -- hundreds of agents, each with unique infrastructure needs, quickly becomes thousands of configuration files.

Experiencing this first hand, I knew there had to be a better way. And so we built runtime hooks for agent storage: `useSearch`, `useDatabase` and `useBlob`. These hooks can be used to create storage in milliseconds that is scoped globally, per-user, or even per-request.

You should not trust that your agent will follow your natural language RBAC guidelines or apply per-user filters to the SQL queries it generates. Much safer to just provision a dedicated database for the duration of the request or for that specific user:

```tsx
// Create an on-demand SQL database in milliseconds
const AnalyzeSpreadsheet = gensx.Component(
  "AnalyzeSpreadsheet",
  async ({ csvData, question }) => {
    // Database provisioned instantly during request
    const db = await useDatabase("user-data");

    // Create a table and import CSV
    await db.execute(`CREATE TABLE data (name TEXT, value NUMBER)`);
    await importCSV(db, csvData);

    // Generate and run SQL based on the question
    const sql = await generateSQL(question);
    const results = await db.execute(sql);

    return formatResults(results);
  },
);

// Vector search for semantic memory, created on-demand
const SemanticMemory = gensx.Component(
  "SemanticMemory",
  async ({ userId, query }) => {
    // Instant vector index with no setup
    const search = await useSearch(`memory-${userId}`);

    const embedding = await OpenAIEmbedding.run({
      model: "text-embedding-3-small",
      input: query,
    });

    // Search for semantically similar memories
    return await search.query({
      vector: embedding.data[0].embedding,
      topK: 5,
    });
  },
);
```

GenSX includes runtime provisioned storage hooks to create user, agent, or workflow-scoped storage on demand in milliseconds:

- `useBlob`: Store JSON, text, audio, video, etc. Perfect for building agents with memory and persistent chat history.
- `useDatabase`: Fully featured SQL databases for agentic analytics like text-to-SQL.
- `useSearch`: Full-text and vector search indexes to power RAG and long-term memory.

These resources are provisioned instantaneously. You can even isolate tenants on storage by user, by agent, or even workflow. This dramatically simplifies the security model for scenarios where you want to give an LLM direct access to query a data store.

### Long-running compute is the default

Just five years ago, if a request in your application took more than a second, someone was getting paged. The P99 latency target was well below 500ms. The entire serverless ecosystem was built on this foundation: handle quick stateless requests, talk to your database, and return in 100ms.

But agentic workloads are different:

- **P50 latency is seconds, not milliseconds**: Even a simple LLM call takes 2-3 seconds for the first token.
- **Workflows run for minutes, not milliseconds**: A document processing workflow might run for 15+ minutes.
- **Agents can run indefinitely**: An agent might need to poll resources, wait for user input, or perform long-running tasks.
- **Chatty workloads**: agents often make thousands of subrequests for things like embeddings, multi-step workflows, and recording telemetry events for observability.

Existing platforms buckle under these requirements. Either they time out (most serverless), cost a fortune (container-based), or require complex orchestration (Kubernetes).

GenSX Cloud offers a true serverless environment built for AI compute:

- **Automatic REST API generation**: `gensx deploy` generates REST APIs for every workflow in your project. This includes a sychronous API with streaming to build user facing apps, and a background job endpoint for long-running tasks like data ingestion.
- **Long-running workloads**: The serverless runtime has a 60 minute timeout to support long-running agents and workflows. And in the coming months we'll remove this limit altogether.
- **10ms cold starts**: A novel architecture that aims to minimize latency.
- **No subrequest limits**: No cap on the number of outgoing requests made by a workflow.
- **MCP Server included**: The [`@gensx/gensx-cloud-mcp`](/docs/cloud/mcp-server) turns all of your deployed workflows into an MCP server that you can consume from Claude desktop, Cursor, or even other agents.

### Observability on steroids

In the olden days observability was all about identifying which query was slow and needed an index added to it. In the agentic world the task is typically about figuring out how the agent produced a hallucinated response that is pissing off one of your customers and putting a renewal at risk.

Traditional tracing over every function call in the stack trace isn't enough. You still care about timing and performance, but what you really need to see is the precise function inputs and outputs at certain steps such as calls to the LLM providers:

![Workflow component tree](/assets/blog/cloud-launch/component-trace.png)

And you still get the full trace with timing for every step:

![Workflow component tree](/assets/blog/cloud-launch/trace.png)

GenSX Cloud automatically captures the entire execution of your workflow, including:

- Every component's inputs and outputs
- Every LLM call with full prompts and responses
- Every storage operation
- The entire execution timeline

## Agents are just workflows (and abstractions are dangerous)

[GenSX](https://github.com/gensx-inc/gensx) is an open source Node.js framework for building agent and workflow backends with reusable components that can be shared across your project and teams. Rather than using a graph-based API to define a DAG, it uses JSX that offers a mixture of declarative easy to read code, and plain old functions for loops conditionals and dynamic behavior where your need it.

The properties of this component model mean that we can make workflows durable by recording inputs and outputs as the program runs, detecting failures, and replaying the program with checkpoints. We're actively working on making this a reality, and in the coming months we will be able to remove the runtime execution limit from GenSX Cloud entirely as a result.

Our experience shipping agents to production made one thing very clear: **abstraction is the devil in agent development**.

The time you save on day one with a fancy agent abstraction, you'll pay back 100x over the coming months as you iterate and hit the edges of what the framework can do. We've built dozens of complex agents, and every time we've regretted starting with high-level abstractions.

That's why in GenSX:

> Agents are just workflows. A workflow can be multiple discrete steps mixing deterministic code with LLM calls, or a single LLM call with tools that is completely non-deterministic.

```tsx
// Deterministic workflow with discrete steps
const ContentCreation = gensx.Component("ContentCreation", ({ topic }) => (
  <Research topic={topic}>
    {(research) => (
      <WriteDraft topic={topic} research={research}>
        {(draft) => <EditDraft draft={draft} />}
      </WriteDraft>
    )}
  </Research>
));

// Non-deterministic agent with tools
const ResearchAgent = gensx.Component("ResearchAgent", ({ query }) => (
  <GSXChatCompletion
    model="gpt-4o"
    messages={[
      { role: "system", content: "You are a research assistant." },
      { role: "user", content: query },
    ]}
    tools={[searchTool, browseTool, summarizeTool]}
  />
));
```

Both are valid approaches in GenSX, and you can use whichever fits your use case—or combine them together in the same application.

But we focus on offering powerful and flexible building blocks like storage and reusable components. This is more of a `shadcn`-style approach to agent frameworks than most other take. And we do so because we believe that similar to building a pixel-perfect application, building a reliable agent means owning 100% of the code and not getting locked into abstraction that you can't customize.

## Pricing for AI workloads

Traditional serverless platforms price their offerings based on the assumptions of web workloads: high concurrency, low latency, and small resource consumption per request. But AI applications often involve fewer, longer-running requests with significant resource usage.

GenSX Cloud is priced for AI workloads:

- **Free tier** for individuals: 50K compute seconds/month, 5-minute maximum execution time, 500MB storage
- **Pro tier** ($20/dev/month): 500K compute seconds/month, 60-minute maximum execution time, and larger storage allocations

We charge for overages if you consume more than your included resources, but the pricing is transparent and predictable—no surprise bills at the end of the month.

## Full-stack TypeScript AI is here

TypeScript developers shouldn't need to learn Python to build sophisticated AI applications. They shouldn't have to cobble together a dozen different services to get basic functionality. And they definitely shouldn't have to become infrastructure experts to ship a simple agent to production.

Whether you're building your first agent or scaling to millions of users, we've solved the hard infrastructure problems so you don't have to. The future of AI isn't just about better models—it's about enabling engineers to build reliable applications with them.

- **Scalable programming model** that focuses on composing workflows from reusable components
- **Serverless runtime** optimized for long-running agents and workflows
- **Built-in storage** for blob data, SQL databases, and vector search—provisioned on-demand
- **Complete observability** for debugging and monitoring

If you're building with GenSX or just starting your AI journey, [give GenSX Cloud a try](/docs/quickstart). The free tier has everything you need to build and deploy your first production-ready agent. Checkout the open source [GenSX project on GitHub](https://github.com/gensx-inc/gensx) and join our [community of AI engineers on Discord](https://discord.gg/wRmwfz5tCy).
