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

## Shipping AI to production is broken

If you've tried to deploy even a moderately complex LLM application to production, you know the pain. The current landscape is a mess:

1. **Traditional serverless has the wrong constraints**. Request timeout limits of 1-5 minutes? Great for serving web pages, terrible for agents that need to run for minutes or hours. Cold starts measured in seconds? Unacceptable when you're already waiting for LLM responses.

2. **Infrastructure for AI is fragmented and complex**. Need to store conversation history? Set up a document database. Need RAG? Deploy a vector database. Need to run background jobs? Configure a task queue. The list goes on, and suddenly you're managing more infrastructure than actual business logic.

3. **Observability is an afterthought**. When something goes wrong in your AI application (and it will), good luck figuring out what happened. Most frameworks don't even capture the full chain of inputs and outputs, let alone provide a way to visualize complex agent executions.

_What if shipping AI to production was as simple as a single CLI command?_

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

_And what if adding storage, search, and databases to your agent was as simple as a `use` hook?_

```tsx
const ChatWithMemory = gensx.Component(
  "ChatWithMemory",
  async ({ userInput, threadId }) => {
    // Instant blob storage with no infra setup
    const blob = useBlob(`chats/${threadId}.json`);

    // Load existing messages
    const messages = (await blob.getJSON()) ?? [];
    messages.push({ role: "user", content: userInput });

    const response = await ChatCompletion.run({
      model: "gpt-4o-mini",
      messages,
    });

    messages.push({ role: "assistant", content: response });
    await blob.putJSON(messages);
    return response;
  }
);
```

Today we're launching [GenSX Cloud](https://gensx.com/docs/cloud), the fastest path from prototype to production for your agents and workflows. One command turns your TypeScript code into production APIs with built-in storage, observability, and support for long-running executions. No more cobbling together a dozen different services just to get basic functionality.

It includes:

1. **Serverless runtime**: `gensx deploy` turns all of your TypeScript workflows into REST APIs deployed on serverless infrastructure. A novel architecture that enables 10ms cold starts and supports long-running execution up to 60 minutes per request.
2. **Cloud storage**: runtime hooks for provisioning blob storage, SQL databases, and vector and full-text search indexes in milliseconds for any agent that needs it.
3. **Tracing and observability**: Automatic tracing of every workflow. Flame graphs of every workflow showing full component inputs and outputs at each step.


## How agents broke our assumptions about infra

I've spent a significant part of my career building and deploying infrastructure at scale — five years as an early employee at Pulumi, working on search in the early days of Azure, and operating services at scale at Amazon. I understand infrastructure as code. I've written a hundred thousand of lines of IaC, authored Kubernetes operators, and scaled services to the moon.

But AI agent workloads contradict everything I've ever learned about infrastructure.

### Static vs ephemeral storage

Infrastructure for traditional web apps is mostly static. You provision resources once, scale them occasionally, and they serve millions of stateless HTTP requests. The infrastructure and application layers are cleanly separated.

Agent workloads flip this model on its head. They need:


1. **Per-user or per-workflow storage**: Each conversation thread, each agent instance, each data processing task might need its own isolated storage.

2. **Physical isolation for security**: When AI generates queries against data, multi-tenant storage becomes a security risk. You need dedicated resources per user or request, not just logical separation. And runtime provisioning needs to happen in milliseconds and not minutes.

3. **Ephemeral, request-scoped resources**: An agent processing a user's CSV needs a database right now, not in 5 minutes after your IaC workflow runs.

4. **Storage as part of application code**: Your business logic and storage provisioning are tightly coupled, not separate deployment steps. Agentic workloads need hooks to provision storage dynamically at runtime.

Writing separate YAML files or running terraform apply every time an agent needs a database is simply unworkable. The state explosion problem is real—hundreds of agents, each with unique infrastructure needs, quickly becomes thousands of configuration files.

Configuring these workloads with traditional tools slows you down. After the hundredth time writing the same boilerplate just to configure storage for a new agent, you realize there has to be a better way:

```tsx
// Create an on-demand SQL database in milliseconds
const AnalyzeSpreadsheet = gensx.Component(
  "AnalyzeSpreadsheet",
  async ({ csvData, question }) => {
    // Database provisioned instantly during request
    const db = await useDatabase("user-data");

    // Create a table and import CSV
    await db.execute(`CREATE TABLE data (name TEXT, value NUMBER)`);
    await db.importCSV("data", csvData);

    // Generate and run SQL based on the question
    const sql = await generateSQL(question);
    const results = await db.execute(sql);

    return formatResults(results);
  }
);

// Vector search for semantic memory, created on-demand
const SemanticMemory = gensx.Component(
  "SemanticMemory",
  async ({ userId, query }) => {
    // Instant vector index with no setup
    const search = await useSearch(`memory-${userId}`);

    const embedding = await OpenAIEmbedding.run({
      model: "text-embedding-3-small",
      input: query
    });

    // Search for semantically similar memories
    return await search.query({
      vector: embedding.data[0].embedding,
      topK: 5
    });
  }
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

Whether you are building responsive chat bots, summarizing and indexing documents in the background, or building internal tools, GenSX Cloud includes the agent-native infrastructure primitives you need.

## Learning from mass production

As we built dozens of agent workflows for our own use, we encountered a scaling problem: the sheer number of unique environments we needed.

Each agent or workflow required:
- A unique deployment with its own API endpoint
- Dedicated storage resources (often multiple kinds)
- Custom observability configuration
- Environment variables and secrets

We found ourselves spending as much time on configuration and infrastructure as on the agents themselves. For every new agent MVP, half the time went to setting up the operational foundation before we could even start building.

The breaking point came when we had 15+ agent workflows, all similar but slightly different, and each requiring its own infrastructure. Copy-pasting boilerplate configuration is not just tedious—it's a significant drag on velocity.

We needed an assembly line for agents. A way to stamp out production-ready AI applications with speed and reliability. Specialized infrastructure that treated agent deployments as first-class entities, not generic functions squeezed into existing patterns.

That realization led to GenSX Cloud.

## Agents are just workflows (and abstractions are dangerous)

[GenSX](https://github.com/gensx-inc/gensx) is an open source Node.js framework for building agent and workflow backends with reusable components that can be shared across your project and teams. Rather than using a graph-based API to define a DAG, it uses JSX that offers a mixture of declarative easy to read code, and plain old functions for loops conditionals and dynamic behavior where your need it.

Our experience shipping agents to production with other frameworks prior to GenSX made one thing very clear: **abstraction is the devil in agent development**.

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
      { role: "user", content: query }
    ]}
    tools={[searchTool, browseTool, summarizeTool]}
  />
));
```

Both are valid approaches in GenSX, and you can use whichever fits your use case—or combine them together in the same application.

We took the same approach to adding state. Things like memory and RAG are extremely domain and use-case specific. What memories should you save? How do you want to chunk documents? How should you retrieve and rank results?

Instead of a one-size-fits-all `Memory` class that will inevitably fail you, we provide solid primitives: blob storage, SQL databases, and search. As we continue to layer in sugar on top, it's always built on these primitives so that when you outgrow the abstraction, you still have full control over the building blocks.

```tsx
// Simple memory using blobs
const SimpleMemory = gensx.Component("SimpleMemory", async ({ agentId, memory }) => {
  const blob = useBlob(`agents/${agentId}/memory.json`);
  const memories = (await blob.getJSON()) ?? [];
  memories.push({ text: memory, timestamp: new Date().toISOString() });
  await blob.putJSON(memories);
});

// Complex memory with vector search
const SemanticMemory = gensx.Component("SemanticMemory", async ({ agentId, memory }) => {
  const search = await useSearch(`memory-${agentId}`);
  const embedding = await OpenAIEmbedding.run({
    model: "text-embedding-3-small",
    input: memory,
  });

  await search.write({
    upsertRows: [{
      id: `memory-${Date.now()}`,
      vector: embedding.data[0].embedding,
      text: memory,
      timestamp: new Date().toISOString(),
      importance: calculateImportance(memory) // Your domain-specific logic
    }]
  });
});
```

By giving you these primitives directly, we let you build exactly what you need without forcing you into rigid patterns that won't scale with your application.

## Cloud-native agents, not just cloud-hosted code

Traditional serverless platforms treat your code as an isolated function that runs in response to HTTP requests. They weren't designed for the stateful, long-running nature of AI workflows.

GenSX Cloud is different. It treats your agents and workflows as first-class cloud resources with built-in:

1. **Ephemeral state provisioning** - Create databases, vector indices, and blob storage on-demand, in milliseconds, right when your agent needs them.

2. **Long-running execution** - Run workflows for up to 60 minutes (5 minutes on the free tier) without timeouts or cold start penalties.

3. **Complete observability** - See every input, output, and LLM call in your workflow with automatic tracing.

### Observability that shows what actually happened

The most frustrating part of debugging AI systems is understanding what went wrong. Did the LLM hallucinate? Did a tool return unexpected data? Was there a bug in your logic?

GenSX Cloud automatically captures the entire execution of your workflow, including:

- Every component's inputs and outputs
- Every LLM call with full prompts and responses
- Every storage operation
- The entire execution timeline

You can watch your workflows execute in real-time or analyze past runs with a visual trace viewer:

![Workflow component tree](/assets/blog/cloud-launch/trace.png)

And you can see the full inputs and outputs for every component that runs in the workflow:

![Workflow component inputs and outputs](/assets/blog/cloud-launch/component-trace.png)

This isn't just nice to have—it's essential for building reliable AI systems. When your customers report issues, you need to see exactly what happened, not just that "something went wrong."

## Building real applications, not just demos

Let's see how GenSX Cloud makes it possible to build production-grade AI applications with minimal code.

Here's a simple RAG workflow that can answer questions based on a knowledge base:

```tsx
import * as gensx from "@gensx/core";
import { OpenAIEmbedding, GSXChatCompletion } from "@gensx/openai";
import { SearchProvider, useSearch } from "@gensx/storage";

// Component to search for relevant documents
const SearchKnowledge = gensx.Component(
  "SearchKnowledge",
  async ({ query }) => {
    const search = await useSearch("knowledge-base");

    // Generate embedding for the query
    const embedding = await OpenAIEmbedding.run({
      model: "text-embedding-3-small",
      input: query,
    });

    // Search for similar documents
    const results = await search.query({
      vector: embedding.data[0].embedding,
      topK: 5,
    });

    return results.map(r => r.attributes?.content).join("\n\n");
  }
);

// RAG workflow that answers questions using the knowledge base
const RAGWorkflow = gensx.Component(
  "RAGWorkflow",
  ({ question }) => (
    <SearchProvider>
      <SearchKnowledge query={question}>
        {(context) => (
          <GSXChatCompletion
            model="gpt-4o-mini"
            messages={[
              {
                role: "system",
                content: `You are an assistant that answers questions based on this context: ${context}`,
              },
              { role: "user", content: question },
            ]}
          />
        )}
      </SearchKnowledge>
    </SearchProvider>
  )
);
```

When deployed to GenSX Cloud, this workflow:

1. Automatically creates vector search indices as needed
2. Scales to handle concurrent requests
3. Captures traces of every execution for debugging
4. Works correctly in both development and production

All without a single line of infrastructure code.

## Pricing for AI workloads

Traditional serverless platforms price their offerings based on the assumptions of web workloads: high concurrency, low latency, and small resource consumption per request. But AI applications often involve fewer, longer-running requests with significant resource usage.

GenSX Cloud is priced for AI workloads:

- **Free tier** for individuals: 50K compute seconds/month, 5-minute maximum execution time, 500MB storage
- **Pro tier** ($20/dev/month): 500K compute seconds/month, 60-minute maximum execution time, and larger storage allocations

We charge for overages if you consume more than your included resources, but the pricing is transparent and predictable—no surprise bills at the end of the month.

## Full-stack TypeScript AI is here

JavaScript and TypeScript developers shouldn't need to learn Python to build sophisticated AI applications. They shouldn't have to cobble together a dozen different services to get basic functionality. And they definitely shouldn't have to become infrastructure experts to ship a simple agent to production.

GenSX Cloud provides everything you need to build and deploy production-grade AI applications without the complexity:

- **Scalable programming model** that focuses on composing workflows from reusable components
- **Serverless runtime** optimized for long-running agents and workflows
- **Built-in storage** for blob data, SQL databases, and vector search—provisioned on-demand
- **Complete observability** for debugging and monitoring

If you're building with GenSX or just starting your AI journey, [give GenSX Cloud a try](/docs/quickstart). The free tier has everything you need to build and deploy your first production-ready agent. Checkout the open source [GenSX project on GitHub](https://github.com/gensx-inc/gensx) and join our [community of AI engineers on Discord](https://discord.gg/wRmwfz5tCy).
