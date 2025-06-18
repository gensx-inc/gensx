# GenSX Client

A minimal TypeScript client for interacting with GenSX workflows.

## Installation

```bash
npm install @gensx/client
```

## Usage

```typescript
import { GenSX } from "@gensx/client";

const gensx = new GenSX({
  apiKey: "your-api-key",
  baseUrl: "https://api.gensx.com", // optional
});
```

## Methods

### `run()`

Execute a workflow and get the output.

```typescript
// Collection mode (default) - get the final output
const { output, progressStream } = await gensx.run<string>("MyWorkflow", {
  org: "my-org",
  project: "my-project",
  environment: "production", // optional
  inputs: {
    userMessage: "Hello",
  },
});

console.log(output); // Final aggregated output

// Streaming mode - get output as it's generated
const { outputStream, progressStream } = await gensx.run<string>("MyWorkflow", {
  org: "my-org",
  project: "my-project",
  stream: true,
  inputs: {
    userMessage: "Hello",
  },
});

for await (const chunk of outputStream) {
  console.log(chunk); // Stream output chunks
}
```

### `runRaw()`

Execute a workflow and get the raw Response object for custom handling.

```typescript
// NDJSON format (default) - newline-delimited JSON
const response = await gensx.runRaw("MyWorkflow", {
  org: "my-org",
  project: "my-project",
  environment: "production", // optional
  inputs: {
    userMessage: "Hello",
  },
  format: "ndjson", // default
});

// Server-Sent Events format
const sseResponse = await gensx.runRaw("MyWorkflow", {
  org: "my-org",
  project: "my-project",
  inputs: {
    userMessage: "Hello",
  },
  format: "sse",
});

// Standard JSON format (no streaming)
const jsonResponse = await gensx.runRaw("MyWorkflow", {
  org: "my-org",
  project: "my-project",
  inputs: {
    userMessage: "Hello",
  },
  format: "json",
});

// Handle the response based on format
if (options.format === "json") {
  const data = await response.json();
  console.log("Result:", data);
} else {
  // Handle streaming formats (sse or ndjson)
  const reader = response.body.getReader();
  // ... process stream ...
}
```

### `start()`

Start a workflow asynchronously and get an execution ID.

```typescript
const { executionId, executionStatus } = await gensx.start("MyWorkflow", {
  org: "my-org",
  project: "my-project",
  environment: "production", // optional
  inputs: {
    userMessage: "Process this in background",
  },
});

console.log(`Started workflow: ${executionId}`);
```

### `getProgress()`

Get progress updates for an async workflow execution.

```typescript
const progressStream = await gensx.getProgress({
  executionId: "abc123",
  format: "ndjson", // or 'sse'
});

// Process progress events
const reader = progressStream.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const events = decoder.decode(value).split("\n").filter(Boolean);
  for (const event of events) {
    console.log(JSON.parse(event));
  }
}
```

## Event Types

GenSX workflows emit the following event types:

```typescript
type GenSXEvent =
  | {
      type: "start";
      workflowExecutionId: string;
      workflowName: string;
      id: string;
      timestamp: string;
    }
  | {
      type: "component-start";
      componentName: string;
      componentId: string;
      id: string;
      timestamp: string;
    }
  | {
      type: "component-end";
      componentName: string;
      componentId: string;
      id: string;
      timestamp: string;
    }
  | { type: "progress"; data: string; id: string; timestamp: string }
  | { type: "output"; content: string; id: string; timestamp: string }
  | { type: "end"; id: string; timestamp: string }
  | {
      type: "error";
      error?: string;
      message?: string;
      id: string;
      timestamp: string;
    };
```

### Event Descriptions:

- **`start`**: Workflow has started, includes workflow name and execution ID
- **`component-start`**: A component within the workflow has started
- **`component-end`**: A component within the workflow has ended
- **`progress`**: Progress update during workflow execution (data is a JSON string)
- **`output`**: A chunk of output text (streaming mode)
- **`end`**: Workflow has ended
- **`error`**: Workflow encountered an error

### Processing Progress Events:

```typescript
import { GenSXEvent } from "@gensx/client";

// From run() method
const { output, progressStream } = await gensx.run("MyWorkflow", options);

const reader = progressStream.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split("\n").filter(Boolean);
  for (const line of lines) {
    const event = JSON.parse(line) as GenSXEvent;

    switch (event.type) {
      case "start":
        console.log("Started:", event.workflowName);
        break;
      case "progress":
        const progressData = JSON.parse(event.data);
        console.log("Progress:", progressData);
        break;
      case "end":
        console.log("Workflow ended");
        break;
      case "error":
        console.error("Error:", event.error || event.message);
        break;
    }
  }
}
```

## Notes

- In collection mode (default), `run()` returns the final output aggregated from all `output` events
- In streaming mode, `outputStream` yields individual output chunks as they arrive
- The `progressStream` contains all non-output events (start, progress, component-start/end, end, error)
- `runRaw()` supports three formats:
  - `'ndjson'` (default): Newline-delimited JSON, ideal for processing with streams
  - `'sse'`: Server-Sent Events, works with EventSource API in browsers
  - `'json'`: Standard JSON response, no streaming
