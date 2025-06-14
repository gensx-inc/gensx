# @gensx/react - React Hooks for GenSX

React hooks and components for interacting with GenSX workflows.

## Installation

This package is part of the monorepo and is available to all apps in the workspace.

```typescript
import { useWorkflow } from '@gensx/react';
```

## useWorkflow Hook

A React hook that mirrors the GenSX Client interface, making it easy to create passthrough APIs.

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
import { useWorkflow } from '@gensx/react';

function MyComponent() {
  const gensx = useWorkflow({
    config: {
      baseUrl: '/api/gensx',
      workflowName: 'ChatWorkflow',
      org: 'my-org',
      project: 'my-project',
      environment: 'production',
    },
    onComplete: (output) => console.log('Done:', output)
  });

  // Run workflow - streams in real-time
  const handleRun = async () => {
    await gensx.run({
      inputs: { userMessage: 'Hello!' }
    });
    // Output is available in gensx.output as it streams
  };

  // Override org/project for specific calls
  const handleCustom = async () => {
    await gensx.run({
      org: 'different-org',
      project: 'different-project',
      inputs: { data: 'custom data' }
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
  baseUrl: string;               // Your API base URL
  workflowName: string;          // Workflow name to execute
  org: string;                   // GenSX organization
  project: string;               // GenSX project
  environment?: string;          // Optional environment
  headers?: Record<string, string>; // Optional request headers
}

interface UseWorkflowConfig<TInputs = unknown, TOutput = unknown> {
  config: WorkflowConfig;        // All workflow configuration
  onStart?: (message: string) => void;
  onComplete?: (output: TOutput) => void;
  onError?: (error: string) => void;
  onEvent?: (event: WorkflowMessage) => void;
}

interface WorkflowRunConfig<TInputs = unknown> {
  inputs: TInputs;
  org?: string;           // Override org for this run
  project?: string;       // Override project for this run
  environment?: string;   // Override environment for this run
}
```

### Return Values

```typescript
interface UseWorkflowResult<TInputs = any, TOutput = any> {
  inProgress: boolean;           // Workflow is running
  error: string | null;          // Error message if any
  output: TOutput | null;        // Final output (accumulated from stream)
  events: WorkflowMessage[];     // All events received
  run: (config: WorkflowRunConfig<TInputs>) => Promise<void>;
  stop: () => void;
}
```

## True Passthrough API

Your API endpoint can be a simple passthrough to GenSX:

```typescript
// app/api/gensx/route.ts
import { GenSX } from '@gensx/client';

export async function POST(request: Request) {
  const body = await request.json();
  const { workflowName, org, project, environment, ...inputs } = body;

  const gensx = new GenSX({
    apiKey: process.env.GENSX_API_KEY!
  });

  // Stream the response
  const response = await gensx.runRaw(workflowName, {
    org,
    project,
    environment,
    inputs
  });

  // Return the streaming response
  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/x-ndjson',
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
    apiKey: process.env.GENSX_API_KEY!
  });

  const response = await gensx.runRaw(workflowName, {
    org: finalOrg,
    project: finalProject,
    environment: finalEnvironment,
    inputs
  });

  return new Response(response.body, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}
```

## GenSX Event Types

```typescript
type GenSXEvent =
  | { type: 'started'; message: string }
  | { type: 'progress'; message: string }
  | { type: 'output'; chunk: string }
  | { type: 'completed'; status: 'success'; output: any }
  | { type: 'error'; error: string };
```

## Migration from Direct Client Usage

If you're currently using the GenSX Client directly in your React components, migrating to the hook is straightforward:

```typescript
// Before - Direct Client usage
const gensx = new GenSX({ apiKey: 'xxx' });
const response = await gensx.runRaw('ChatWorkflow', {
  org: 'my-org',
  project: 'my-project',
  inputs: { userMessage: 'Hello' }
});

// After - Using the hook
const gensx = useWorkflow({
  config: {
    baseUrl: '/api/gensx',
    workflowName: 'ChatWorkflow',
    org: 'my-org',
    project: 'my-project'
  }
});
await gensx.run({
  inputs: { userMessage: 'Hello' }
});
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
import { useWorkflow } from '@gensx/react';

// Basic usage
const gensx = useWorkflow({
  config: {
    baseUrl: '/api/gensx',
    workflowName: 'MyWorkflow',
    org: 'my-org',
    project: 'my-project',
    environment: 'production',
  }
});

// With type-safe output
interface ChatResponse {
  message: string;
  confidence: number;
}

const gensx = useWorkflow<UpdateDraftInput, ChatResponse>({
  config: {
    baseUrl: '/api/gensx',
    workflowName: 'ChatWorkflow',
    org: 'my-org',
    project: 'my-project',
  },
  onComplete: (output) => {
    // output is typed as ChatResponse
    console.log(output.message);
    console.log(output.confidence);
  }
});

// Real-time streaming with automatic output accumulation
const gensx = useWorkflow<UpdateDraftInput, string>({
  config: {
    baseUrl: '/api/gensx',
    workflowName: 'MyWorkflow',
    org: 'my-org',
    project: 'my-project',
  },
  onEvent: (event) => {
    // Called for each event
    if (event.type === 'output') {
      console.log('New chunk:', event.content);
    }
  }
});

// During streaming, gensx.output is updated in real-time
await gensx.run({ inputs: { message: 'Hello' } });
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
interface UseWorkflowResult<TInputs = any, TOutput = any> {
  inProgress: boolean;
  error: string | null;
  output: TOutput | null;
  events: WorkflowMessage[];
  run: (config: WorkflowRunConfig<TInputs>) => Promise<void>;
  stop: () => void;
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
    baseUrl: '/api/gensx',
    workflowName: 'UpdateDraft',
    org: 'my-org',
    project: 'my-project',
  },
  onComplete: (output) => {
    setDraft(output.content);
    setWordCount(output.wordCount);
  }
});

await gensx.run({
  inputs: { userMessage: 'Make it shorter' }
});

// Access the output as it streams
console.log('Current output:', gensx.output);
```

**With Progress Updates:**
```typescript
const gensx = useWorkflow<StoryInput, string>({
  config: {
    baseUrl: '/api/gensx',
    workflowName: 'GenerateStory',
    org: 'my-org',
    project: 'my-project',
  },
  onEvent: (event) => {
    if (event.type === 'output') {
      console.log('New chunk:', event.content);
    }
  },

  onComplete: (finalOutput) => {
    console.log('Complete:', finalOutput);
  }
});

await gensx.run({
  inputs: { prompt: 'Tell me a story' }
});
```

**With Configuration Overrides:**
```typescript
const gensx = useWorkflow({
  config: {
    baseUrl: '/api/gensx',
    workflowName: 'MyWorkflow',
    org: 'my-org',
    project: 'my-project',
    environment: 'production',
    headers: {
      'X-Custom-Header': 'value'
    }
  }
});

// Uses config values
await gensx.run({
  inputs: { data: 'test' }
});

// Override org/project/environment for specific run
await gensx.run({
  org: 'different-org',
  project: 'different-project',
  inputs: { data: 'test' }
});
```

## Components

(Add component documentation here)
