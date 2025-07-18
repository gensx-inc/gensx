# @gensx/react - React Hooks for GenSX

React hooks for interacting with GenSX workflows.

## Installation

```bash
npm install @gensx/react
```

## useWorkflow Hook

A React hook for interacting with GenSX workflows.

```typescript
import { useWorkflow } from "@gensx/react";
```

### Features

- **Client-compatible interface**: Accepts the same parameters as the GenSX Client
- **Two modes**: Collection (wait for complete output) and Streaming (real-time chunks)
- **Default configuration**: Set defaults that can be overridden per call
- **Event handling**: Callbacks for all GenSX event types
- **State management**: Tracks loading, errors, output, and progress
- **Abort support**: Stop workflows in progress
- **TypeScript**: Full type safety with GenSX event types

### Basic Usage

```tsx
import { useWorkflow } from "@gensx/react";

function MyComponent() {
  const gensx = useWorkflow({
    config: {
      baseUrl: "/api/gensx",
    },
    onComplete: (output) => console.log("Done:", output),
  });

  // Run workflow - streams in real-time
  const handleRun = async () => {
    await gensx.run({
      inputs: { userMessage: "Hello!" },
    });
    // Output is available in gensx.output as it streams
  };

  // Override org/project for specific calls
  const handleCustom = async () => {
    await gensx.run({
      org: "different-org",
      project: "different-project",
      inputs: { data: "custom data" },
    });
  };

  return (
    <div>
      <button onClick={handleRun}>Run</button>
      {gensx.inProgress && <p>Loading...</p>}
      {gensx.error && <p>Error: {gensx.error}</p>}
      <div>{gensx.output}</div>
    </div>
  );
}
```

### Hook Options

```typescript
interface WorkflowConfig {
  baseUrl: string; // Your API base URL
  headers?: Record<string, string>; // Optional request headers
}

interface UseWorkflowConfig<TOutput = unknown> {
  config: WorkflowConfig; // All workflow configuration
  onStart?: (message: string) => void;
  onComplete?: (output: TOutput | null) => void;
  onError?: (error: string) => void;
  onEvent?: (event: WorkflowMessage) => void;
  outputTransformer?: (accumulatedContent: string) => TOutput;
}

interface WorkflowRunConfig<TInputs = unknown> {
  inputs: TInputs;
  org?: string; // Override org for this run
  project?: string; // Override project for this run
  environment?: string; // Override environment for this run
}
```

### Return Values

```typescript
interface UseWorkflowResult<TInputs = unknown, TOutput = unknown> {
  inProgress: boolean; // Workflow is running
  error: string | null; // Error message if any
  output: TOutput | null; // Final output (accumulated from stream)
  execution: WorkflowMessage[]; // All events received
  run: (config: WorkflowRunConfig<TInputs>) => Promise<void>;
  stop: () => void;
  clear: () => void; // Clear all workflow state
}
```

## True Passthrough API

Your API endpoint can be a simple passthrough to GenSX:

```typescript
// app/api/gensx/route.ts
import { GenSX } from "@gensx/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { workflowName, org, project, environment, ...inputs } = body;

  const gensx = new GenSX({
    apiKey: process.env.GENSX_API_KEY!,
  });

  // Stream the response
  const response = await gensx.runRaw(workflowName, {
    org,
    project,
    environment,
    inputs,
  });

  // Return the streaming response
  return new Response(response.body, {
    headers: {
      "Content-Type": "application/x-ndjson",
    },
  });
}
```

### With Environment Defaults

Your API can provide defaults from environment variables:

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const { workflowName, org, project, environment, ...inputs } = body;

  // Use environment defaults if not provided
  const finalOrg = org || process.env.GENSX_ORG;
  const finalProject = project || process.env.GENSX_PROJECT;
  const finalEnvironment = environment || process.env.GENSX_ENVIRONMENT;

  const gensx = new GenSX({
    apiKey: process.env.GENSX_API_KEY!,
  });

  const response = await gensx.runRaw(workflowName, {
    org: finalOrg,
    project: finalProject,
    environment: finalEnvironment,
    inputs,
  });

  return new Response(response.body, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
```

## GenSX Event Types

```typescript
type WorkflowMessage =
  | { type: "start"; workflowName: string }
  | { type: "data"; data: JsonValue }
  | { type: "event"; label: string; data: JsonValue }
  | { type: "end" }
  | { type: "error"; error: string }
  | { type: "object"; label: string; patches: Operation[]; isInitial: boolean };
```

## Examples

See `src/examples/gensx-example.tsx` for a complete example component.

## Legacy Hook

The original `useWorkflow` hook is still available for backwards compatibility but we recommend using `useWorkflow` for new projects.

## UI Package

React components and hooks for the monorepo.

## Hooks

### useWorkflow

A React hook for interacting with GenSX workflows via your API endpoint. Supports TypeScript generics for type-safe outputs.

**Key Features:**

- ✨ Real-time output updates during streaming
- 🔄 Two modes: Collection (wait for complete output) and Streaming (real-time chunks)
- 📝 TypeScript support with generics
- 🎯 Event callbacks for all workflow events
- 🚀 Automatic output accumulation

```typescript
import { useWorkflow } from "@gensx/react";

// Basic usage
const gensx = useWorkflow({
  config: {
    baseUrl: "/api/gensx",
  },
});

// With type-safe output
interface ChatResponse {
  message: string;
  confidence: number;
}

const gensx = useWorkflow<UpdateDraftInput, ChatResponse>({
  config: {
    baseUrl: "/api/gensx",
  },
  onComplete: (output) => {
    // output is typed as ChatResponse | null
    if (output) {
      console.log(output.message);
      console.log(output.confidence);
    }
  },
});

// Real-time streaming with automatic output accumulation
const gensx = useWorkflow<UpdateDraftInput, string>({
  config: {
    baseUrl: "/api/gensx",
  },
  onEvent: (event) => {
    // Called for each event
    if (event.type === "output") {
      console.log("New chunk:", event.content);
    }
  },
});

// During streaming, gensx.output is updated in real-time
await gensx.run({ inputs: { message: "Hello" } });
// gensx.output contains the accumulated text as it streams
```

#### Hook Options

```typescript
interface UseWorkflowConfig<TInputs = unknown, TOutput = unknown> {
  config: WorkflowConfig;
  onStart?: (message: string) => void;
  onComplete?: (output: TOutput) => void;
  onError?: (error: string) => void;
  onEvent?: (event: WorkflowMessage) => void;
}
```

#### Hook Return Value

```typescript
interface UseWorkflowResult<TInputs = unknown, TOutput = unknown> {
  inProgress: boolean;
  error: string | null;
  output: TOutput | null;
  execution: WorkflowMessage[];
  run: (config: WorkflowRunConfig<TInputs>) => Promise<void>;
  stop: () => void;
  clear: () => void;
}
```

#### Examples

**Streaming with Typed Output:**

```typescript
interface DraftResponse {
  content: string;
  wordCount: number;
}

const gensx = useWorkflow<UpdateDraftInput, DraftResponse>({
  config: {
    baseUrl: "/api/gensx",
  },
  onComplete: (output) => {
    if (output) {
      setDraft(output.content);
      setWordCount(output.wordCount);
    }
  },
});

await gensx.run({
  inputs: { userMessage: "Make it shorter" },
});

// Access the output as it streams
console.log("Current output:", gensx.output);
```

**With Progress Updates:**

```typescript
const gensx = useWorkflow<StoryInput, string>({
  config: {
    baseUrl: "/api/gensx",
  },
  onEvent: (event) => {
    if (event.type === "output") {
      console.log("New chunk:", event.content);
    }
  },

  onComplete: (finalOutput) => {
    console.log("Complete:", finalOutput);
  },
});

await gensx.run({
  inputs: { prompt: "Tell me a story" },
});
```

**With Configuration Overrides:**

```typescript
const gensx = useWorkflow({
  config: {
    baseUrl: "/api/gensx",
    headers: {
      "X-Custom-Header": "value",
    },
  },
});

// Basic run with org/project/environment
await gensx.run({
  inputs: { data: "test" },
  org: "my-org",
  project: "my-project",
  environment: "my-env",
});

// Override org/project/environment for specific run
await gensx.run({
  org: "different-org",
  project: "different-project",
  inputs: { data: "test" },
});
```

## useObject Hook

A React hook for accessing streaming object state from GenSX workflows. Now supports efficient JSON patch-based updates for improved performance.

### Features

- **JSON Patch Support**: Efficiently handles incremental object updates using JSON patches
- **String Optimizations**: Automatic optimizations for streaming text scenarios (string-append, string-diff)
- **Real-time Updates**: Object state updates in real-time as patches are received
- **Error Handling**: Graceful error handling with fallback to previous state
- **Type Safety**: Full TypeScript support with generics

### Basic Usage

```tsx
import { useWorkflow, useObject } from "@gensx/react";

function MyComponent() {
  const workflow = useWorkflow({
    config: { baseUrl: "/api/gensx" },
  });

  // Get streaming object state
  const userProfile = useObject(workflow.execution, "user-profile");
  const chatResponse = useObject(workflow.execution, "chat-response");

  return (
    <div>
      <h1>User: {userProfile?.name}</h1>
      <p>Age: {userProfile?.age}</p>
      <div>
        <h2>Chat Response:</h2>
        <p>{chatResponse?.content}</p>
      </div>
    </div>
  );
}
```

### Streaming LLM Response

Perfect for streaming LLM responses where text is progressively built up:

```tsx
function StreamingChat() {
  const workflow = useWorkflow({
    config: { baseUrl: "/api/chat" },
  });

  const chatResponse = useObject(workflow.execution, "chat-response");

  return (
    <div>
      <button onClick={() => workflow.run({ inputs: { message: "Hello!" } })}>
        Send Message
      </button>

      {chatResponse && (
        <div className="chat-bubble">{chatResponse.content}</div>
      )}
    </div>
  );
}
```

### Performance Benefits

The hook automatically handles JSON patch operations for optimal performance:

- **String Append**: Efficiently appends text for streaming scenarios
- **String Diff**: Character-level diffing for complex string changes
- **Incremental Updates**: Only changed parts of objects are transmitted
- **Reduced Bandwidth**: Up to 55% reduction in message size for streaming content

### Type Safety

Use TypeScript generics for type-safe object access:

```tsx
interface ChatResponse {
  content: string;
  timestamp: number;
  isComplete: boolean;
}

const chatResponse = useObject<ChatResponse>(
  workflow.execution,
  "chat-response",
);
// chatResponse is typed as ChatResponse | undefined
```

## useEvents Hook

A React hook for accessing all events with a specific label from GenSX workflows.

```tsx
import { useEvents } from "@gensx/react";

function ProgressComponent() {
  const workflow = useWorkflow({
    config: { baseUrl: "/api/gensx" },
  });

  const progressEvents = useEvents(workflow.execution, "progress");

  return (
    <div>
      {progressEvents.map((event, index) => (
        <div key={index}>{event.message}</div>
      ))}
    </div>
  );
}
```
