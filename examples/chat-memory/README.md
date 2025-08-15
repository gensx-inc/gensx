# GenSX Chat Memory Example

This example demonstrates the powerful new **GenSX Memory** abstraction - a sophisticated memory layer that provides semantic search, automatic fact extraction, and intelligent conversation management on top of GenSX Storage.

## What's New in GenSX Memory

GenSX Memory goes beyond simple chat history storage to provide:

- **🧠 Semantic Memory** - Persistent facts and preferences that survive across sessions
- **📝 Episodic Memory** - Contextual event logging of interactions and outcomes  
- **⚡ Short-term Memory** - Rolling conversation buffer with automatic summarization
- **🔍 Hybrid Search** - Combines vector similarity, keyword search, and recency scoring
- **🤖 Agent Integration** - Drop-in `attach()` method adds memory to any agent
- **🎯 Automatic Fact Extraction** - Learns preferences and facts from conversations

## How It Works

### Smart Memory (Recommended)

The `SmartChatWithMemory` component shows the simplest approach - just attach memory to your agent:

```typescript
// Create memory instance with scoped namespacing
const memory = createMemory({
  scope: {
    workspaceId: "chat-example",
    userId,
    agentId: "chat-assistant", 
    threadId,
  },
});

// Attach memory capabilities to your agent
const agentWithMemory = await memory.attach(ChatAgent, {
  preRecall: { limit: 5, types: ["semantic", "episodic", "shortTerm"] },
  postTurn: { logEpisodic: true, extractFacts: true },
});

// Use the agent normally - memory is handled automatically!
const response = await agentWithMemory({ messages });
```

### Manual Memory Control

The `SimpleChatWithMemory` component shows manual memory management:

```typescript
const memory = createMemory({ scope: { workspaceId, userId, threadId } });

// Store memories manually
await memory.remember({
  text: userInput,
  type: "shortTerm",
  tags: ["conversation"],
});

// Recall relevant context
const context = await memory.recall({
  types: ["shortTerm"],
  limit: 10,
});
```

## Memory Types Explained

- **Semantic** (`type: "semantic"`) - Long-term facts like "User prefers dark mode" or "Derek works at GenSX"
- **Episodic** (`type: "episodic"`) - Event logs like "User searched for authentication tutorials" 
- **Short-term** (`type: "shortTerm"`) - Recent conversation turns, auto-summarized when buffer fills

## Running the Examples

### Prerequisites

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up your environment variables:
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

3. Log in to GenSX (if you haven't already):
   ```bash
   npx gensx login
   ```

### Try the Memory Demo

Run the memory demonstration to see semantic search and fact storage in action:

```bash
gensx run MemoryDemoWorkflow --input '{}'
```

This will:
1. Store user preferences and conversation history
2. Perform semantic searches to find relevant memories
3. Show how different memory types work together

### Smart Chat with Memory

Test the intelligent memory-enhanced chat:

```bash
gensx run ChatMemoryWorkflow --input '{
  "userInput": "I love TypeScript and prefer concise explanations", 
  "threadId": "thread-1",
  "userId": "alice",
  "useSmartMemory": true
}'
```

Continue the conversation to see memory in action:

```bash
gensx run ChatMemoryWorkflow --input '{
  "userInput": "Can you help me with React hooks?",
  "threadId": "thread-1", 
  "userId": "alice",
  "useSmartMemory": true
}'
```

The agent will remember Alice's preferences for TypeScript and concise explanations!

### Simple Memory Approach

Compare with the manual memory approach:

```bash
gensx run ChatMemoryWorkflow --input '{
  "userInput": "Hello, I need help with Next.js",
  "threadId": "thread-2",
  "userId": "bob", 
  "useSmartMemory": false
}'
```

## Cloud Deployment

Deploy your memory-enhanced workflows to GenSX Cloud:

```bash
pnpm run deploy
```

Once deployed, visit the [GenSX console](https://app.gensx.com) to:
- Test your workflows with the built-in UI
- Analyze memory performance and traces
- Monitor fact extraction and recall accuracy
- Get code snippets for integration

## Local Development

### Run the workflow directly

```bash
pnpm dev "What's the weather like?" "my-thread"
```

### Start the API server

```bash
pnpm start
```

Test the API:

```bash
curl -X POST http://localhost:1337/workflows/ChatMemoryWorkflow \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "I prefer technical explanations",
    "threadId": "test-thread",
    "userId": "test-user",
    "useSmartMemory": true
  }'
```

## Memory Architecture

GenSX Memory provides:

1. **Scoped Namespacing** - Separate memories by workspace/user/agent/thread
2. **Hybrid Retrieval** - Vector similarity + keyword search + recency scoring  
3. **Automatic Embeddings** - Uses OpenAI's text-embedding-3-small (with fallback)
4. **Fact Extraction** - Identifies preferences, relationships, and important statements
5. **Buffer Management** - Short-term memory automatically summarizes when full
6. **Agent Integration** - Drop-in memory enhancement for any GenSX component

## Configuration Options

```typescript
const memory = createMemory({
  scope: { workspaceId, userId, agentId, threadId },
  policy: {
    shortTerm: {
      tokenLimit: 4000,           // Buffer size before summarization
      summarizeOverflow: true,    // Auto-summarize old messages
    },
    observability: {
      trace: true,                // Enable memory operation logging
    },
  },
});
```

## Learn More

- **[GenSX Storage Documentation](https://docs.gensx.com/storage)** - Vector search and blob storage
- **[GenSX Core Documentation](https://docs.gensx.com/core)** - Component and workflow patterns
- **[Memory API Reference](https://docs.gensx.com/storage/memory)** - Complete API documentation

Try the example and see how GenSX Memory transforms your chat applications from simple request-response to intelligent, context-aware conversations!