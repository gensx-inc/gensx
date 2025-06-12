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
    endpoint: '/api/gensx',
    defaultConfig: {
      org: 'my-org',
      project: 'my-project',
      environment: 'production'
    },
    onOutput: (chunk) => console.log('Received:', chunk),
    onComplete: (output) => console.log('Done:', output)
  });

  // Collection mode - wait for complete output
  const handleRun = async () => {
    const result = await gensx.run('ChatWorkflow', {
      inputs: { userMessage: 'Hello!' }
    });
    console.log('Final result:', result);
  };

  // Streaming mode - get chunks as they arrive
  const handleStream = async () => {
    await gensx.stream('ChatWorkflow', {
      inputs: { userMessage: 'Tell me a story' }
    });
    // Output chunks are available in gensx.outputChunks
  };

  // Override defaults for specific calls
  const handleCustom = async () => {
    await gensx.run('DifferentWorkflow', {
      org: 'different-org',
      project: 'different-project',
      inputs: { data: 'custom data' }
    });
  };

  return (
    <div>
      <button onClick={handleRun}>Run</button>
      <button onClick={handleStream}>Stream</button>
      {gensx.isLoading && <p>Loading...</p>}
      {gensx.error && <p>Error: {gensx.error}</p>}
    </div>
  );
}
```

### Hook Options

```typescript
interface UseGenSXOptions {
  endpoint: string;                         // Your API endpoint URL
  defaultConfig?: Partial<GenSXRunOptions>; // Default org/project/env
  headers?: Record<string, string>;         // Optional request headers
  onStart?: (message: string) => void;
  onProgress?: (message: string) => void;
  onOutput?: (chunk: string) => void;
  onComplete?: (output: any) => void;
  onError?: (error: string) => void;
  onEvent?: (event: GenSXEvent) => void;
}

interface GenSXRunOptions {
  org: string;           // GenSX organization
  project: string;       // GenSX project
  environment?: string;  // Optional environment
  inputs?: Record<string, any>;  // Workflow inputs
}
```

### Return Values

```typescript
interface UseGenSXResult {
  isLoading: boolean;           // Workflow is running
  isStreaming: boolean;         // In streaming mode
  error: string | null;         // Error message if any
  output: any;                  // Final output (collection mode)
  outputChunks: string[];       // Output chunks (streaming mode)
  events: GenSXEvent[];         // All events received
  progressMessages: string[];   // Progress messages

  run: (workflowName: string, options?: Partial<GenSXRunOptions>) => Promise<any>;
  stream: (workflowName: string, options?: Partial<GenSXRunOptions>) => Promise<void>;
  stop: () => void;
  clear: () => void;
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

  // Use runRaw for direct passthrough
  const response = await gensx.runRaw(workflowName, {
    org,       // From request body
    project,   // From request body
    environment,
    inputs
  });

  // Return the raw GenSX response
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
  endpoint: '/api/gensx',
  defaultConfig: { org: 'my-org', project: 'my-project' }
});
const result = await gensx.run('ChatWorkflow', {
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
  endpoint: '/api/gensx',
  defaultConfig: {
    org: 'my-org',
    project: 'my-project',
    environment: 'production'
  }
});

// With type-safe output
interface ChatResponse {
  message: string;
  confidence: number;
}

const gensx = useWorkflow<ChatResponse>({
  endpoint: '/api/gensx',
  onComplete: (output) => {
    // output is typed as ChatResponse
    console.log(output.message);
    console.log(output.confidence);
  }
});

// Real-time streaming with automatic output accumulation
const gensx = useWorkflow<string>({
  endpoint: '/api/gensx',
  onOutput: (chunk) => {
    // Called for each chunk
    console.log('New chunk:', chunk);
  }
});

// During streaming, gensx.output is updated in real-time
// No need to manually concatenate chunks!
await gensx.stream('MyWorkflow', { inputs: { message: 'Hello' } });
// gensx.output contains the accumulated text as it streams
```

#### Hook Options

```typescript
interface UseGenSXOptions<TOutput = any> {
  endpoint: string;
  defaultConfig?: Partial<GenSXRunOptions>;
  headers?: Record<string, string>;
  onStart?: (message: string) => void;
  onProgress?: (message: string | any) => void;
  onOutput?: (chunk: string) => void;
  onComplete?: (output: TOutput) => void;
  onError?: (error: string) => void;
  onEvent?: (event: GenSXEvent) => void;
}
```

#### Hook Return Value

```typescript
interface UseGenSXResult<TOutput = any> {
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  output: TOutput | null;
  outputChunks: string[];
  events: GenSXEvent[];
  progressMessages: string[];
  run: (workflowName: string, options?: Partial<GenSXRunOptions>) => Promise<TOutput | null>;
  stream: (workflowName: string, options?: Partial<GenSXRunOptions>) => Promise<void>;
  stop: () => void;
  clear: () => void;
}
```

#### Examples

**Collection Mode with Typed Output:**
```typescript
interface DraftResponse {
  content: string;
  wordCount: number;
}

const gensx = useWorkflow<DraftResponse>({
  endpoint: '/api/gensx',
  onComplete: (output) => {
    setDraft(output.content);
    setWordCount(output.wordCount);
  }
});

const result = await gensx.run('UpdateDraft', {
  inputs: { userMessage: 'Make it shorter' }
});

if (result) {
  console.log(`Updated draft: ${result.content} (${result.wordCount} words)`);
}
```

**Streaming Mode with Progress Updates:**
```typescript
const gensx = useWorkflow<string>({
  endpoint: '/api/gensx',
  onOutput: (chunk) => {
    // Append each chunk to the output
    setContent(prev => prev + chunk);
  },
  onProgress: (progress) => {
    // Handle structured progress events
    if (typeof progress === 'object' && progress.type) {
      console.log(`Progress: ${progress.type} - ${progress.content}`);
    }
  },
  onComplete: (finalOutput) => {
    console.log('Streaming complete:', finalOutput);
  }
});

await gensx.stream('GenerateStory', {
  inputs: { prompt: 'Tell me a story' }
});
```

**With Default Configuration:**
```typescript
const gensx = useWorkflow({
  endpoint: '/api/gensx',
  defaultConfig: {
    org: 'my-org',
    project: 'my-project',
    environment: 'production'
  },
  headers: {
    'X-Custom-Header': 'value'
  }
});

// Uses defaults
await gensx.run('MyWorkflow', {
  inputs: { data: 'test' }
});

// Override defaults
await gensx.run('MyWorkflow', {
  org: 'different-org',
  project: 'different-project',
  inputs: { data: 'test' }
});
```

## Components

(Add component documentation here)
