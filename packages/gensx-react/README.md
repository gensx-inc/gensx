# @gensx/react

React hooks for executing and streaming GenSX workflows with real-time state updates.

## Installation

```bash
npm install @gensx/react
```

## Features

- **Synchronous Workflow Execution**: Execute workflows and get results directly
- **Asynchronous Workflow Execution**: Start long-running workflows and get execution IDs
- **Real-time State Streaming**: Subscribe to hierarchical workflow state updates via Server-Sent Events
- **TypeScript Support**: Full type safety for workflow inputs, outputs, and state
- **JSON Patch Updates**: Efficient state synchronization with delta updates
- **Connection Management**: Automatic reconnection and proper cleanup

## Quick Start

```tsx
import { useWorkflowWithState } from "@gensx/react";

function BlogWorkflow() {
  const { start, state, isLoading, error } = useWorkflowWithState(
    "/blog-writer",
    "blog", // Optional state name filter
  );

  const handleStart = () => {
    start({
      title: "The Future of AI",
      prompt: "Write about emerging trends",
    });
  };

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={handleStart} disabled={isLoading}>
        {isLoading ? "Starting..." : "Start Blog Workflow"}
      </button>

      {state && (
        <div>
          <h2>Phase: {state.overall.phase}</h2>
          <div>
            Research: {state.research.completedTopics.length} topics completed
          </div>
          <div>Draft: {state.draft.wordCount} words</div>
        </div>
      )}
    </div>
  );
}
```

## Hooks

### useWorkflow

Execute workflows synchronously and get results directly.

```tsx
import { useWorkflow } from "@gensx/react";

function SyncWorkflowExample() {
  const { execute, isLoading, error, result } = useWorkflow<
    { title: string },
    { content: string }
  >("/generate-content");

  const handleExecute = async () => {
    try {
      const output = await execute({ title: "AI in 2025" });
      console.log("Result:", output.content);
    } catch (err) {
      console.error("Workflow failed:", err);
    }
  };

  return (
    <div>
      <button onClick={handleExecute} disabled={isLoading}>
        {isLoading ? "Generating..." : "Generate Content"}
      </button>
      {result && <div>Generated: {result.content}</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### useAsyncWorkflow

Start workflows asynchronously and get execution IDs for long-running processes.

```tsx
import { useAsyncWorkflow } from "@gensx/react";

function AsyncWorkflowExample() {
  const { start, isLoading, error, executionId } = useAsyncWorkflow<{
    title: string;
    prompt: string;
  }>("/blog-writer");

  const handleStart = async () => {
    try {
      const execId = await start({
        title: "Machine Learning Trends",
        prompt: "Write a comprehensive blog post",
      });
      console.log("Started workflow:", execId);
    } catch (err) {
      console.error("Failed to start workflow:", err);
    }
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isLoading}>
        {isLoading ? "Starting..." : "Start Workflow"}
      </button>
      {executionId && <div>Execution ID: {executionId}</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### useWorkflowState

Subscribe to real-time state updates from a running workflow execution.

```tsx
import { useWorkflowState } from "@gensx/react";

interface BlogWorkflowState {
  overall: { phase: string; progress: { current: number; total: number } };
  research: {
    topics: string[];
    completedTopics: string[];
    currentTopic?: string;
  };
  draft: { sections: string[]; wordCount: number; status: string };
}

function WorkflowStateExample({ executionId }: { executionId: string }) {
  const { data, isLoading, error, isComplete } =
    useWorkflowState<BlogWorkflowState>(
      executionId,
      "blog", // Optional: filter by state name
    );

  if (isLoading) return <div>Connecting to state stream...</div>;
  if (error) return <div>Stream error: {error.message}</div>;
  if (!data) return <div>No state data available</div>;

  return (
    <div>
      <h2>Workflow Progress</h2>
      <div>Phase: {data.overall.phase}</div>
      <div>
        Progress: {data.overall.progress.current}/{data.overall.progress.total}
      </div>

      <h3>Research Status</h3>
      <div>Topics: {data.research.topics.length}</div>
      <div>Completed: {data.research.completedTopics.length}</div>
      {data.research.currentTopic && (
        <div>Current: {data.research.currentTopic}</div>
      )}

      <h3>Draft Status</h3>
      <div>Sections: {data.draft.sections.length}</div>
      <div>Word Count: {data.draft.wordCount}</div>
      <div>Status: {data.draft.status}</div>

      {isComplete && <div>✅ Workflow Complete!</div>}
    </div>
  );
}
```

### useWorkflowWithState

Combined hook that starts a workflow asynchronously and streams its state.

```tsx
import { useWorkflowWithState } from "@gensx/react";

interface BlogInput {
  title: string;
  prompt: string;
}

interface BlogState {
  overall: { phase: string };
  research: { topics: string[]; completedTopics: string[] };
  draft: { wordCount: number; status: string };
}

function CombinedWorkflowExample() {
  const { start, state, isLoading, error, isComplete, executionId } =
    useWorkflowWithState<BlogInput, BlogState>("/blog-writer", "blog");

  const handleStart = () => {
    start({
      title: "The Future of AI in 2025",
      prompt: "Write about emerging AI trends and their impact",
    });
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isLoading}>
        {isLoading ? "Starting..." : "Start Blog Workflow"}
      </button>

      {executionId && <div>Execution ID: {executionId}</div>}

      {state && (
        <div>
          <h2>Real-time Progress</h2>
          <div>Phase: {state.overall.phase}</div>
          <div>Research Topics: {state.research.topics.length}</div>
          <div>Completed: {state.research.completedTopics.length}</div>
          <div>Draft Word Count: {state.draft.wordCount}</div>
          <div>Draft Status: {state.draft.status}</div>
        </div>
      )}

      {isComplete && <div>✅ Workflow Complete!</div>}
      {error && <div>❌ Error: {error.message}</div>}
    </div>
  );
}
```

## Configuration

All hooks accept an optional `options` parameter for configuration:

### Development Configuration

For local development with the GenSX dev server:

```tsx
const devOptions = {
  // Base URL for the GenSX dev server (defaults to http://localhost:1337)
  baseUrl: "http://localhost:1337",

  // Request timeout in milliseconds (defaults to 30000)
  timeout: 60000,
};

const { execute } = useWorkflow("/my-workflow", devOptions);
const { start } = useAsyncWorkflow("/my-workflow", devOptions);
const { data } = useWorkflowState(executionId, "state-name", devOptions);
```

### Production Configuration

For production deployment with the GenSX API (automatically uses https://api.gensx.com):

```tsx
const prodOptions = {
  // Request timeout in milliseconds (defaults to 30000)
  timeout: 60000,

  // Production API configuration
  production: {
    org: "your-org",
    project: "your-project",
    environment: "default", // or "staging", "production", etc.
    apiKey: "your-gensx-api-key",
    // apiBaseUrl: "https://api.gensx.com", // optional, defaults to https://api.gensx.com
  },
};

const { execute } = useWorkflow("YourWorkflow", prodOptions);
const { start } = useAsyncWorkflow("YourWorkflow", prodOptions);
const { data } = useWorkflowState(executionId, "state-name", prodOptions);
```

## TypeScript Support

All hooks are fully typed and support generics for type-safe workflow integration:

```tsx
// Define your workflow types
interface WorkflowInput {
  title: string;
  content: string;
}

interface WorkflowOutput {
  result: string;
  metadata: { wordCount: number };
}

interface WorkflowState {
  phase: "processing" | "complete";
  progress: number;
}

// Use with full type safety
const { execute } = useWorkflow<WorkflowInput, WorkflowOutput>("/my-workflow");
const { start } = useAsyncWorkflow<WorkflowInput>("/my-workflow");
const { data } = useWorkflowState<WorkflowState>(executionId);
const { start, state } = useWorkflowWithState<WorkflowInput, WorkflowState>(
  "/my-workflow",
);
```

## Hierarchical State Composition

This package integrates seamlessly with GenSX's hierarchical state composition system:

```tsx
// Workflow State Type (matches your GenSX workflow)
interface BlogWorkflowState {
  overall: {
    phase: "research" | "outline" | "draft" | "editorial" | "complete";
    progress: { current: number; total: number };
  };
  research: {
    topics: string[];
    completedTopics: string[];
    currentTopic?: string;
    phase: "generating" | "researching" | "complete";
  };
  draft: {
    sections: Array<{ heading: string; content: string }>;
    wordCount: number;
    status: "draft" | "review" | "complete";
  };
  editorial: {
    reviews: Array<{ section: string; feedback: string }>;
    status: "pending" | "reviewing" | "complete";
  };
}

// Component that displays hierarchical state
function BlogWorkflowDashboard() {
  const { start, state, isLoading, error } = useWorkflowWithState<
    { title: string; prompt: string },
    BlogWorkflowState
  >("/blog-writer", "blog");

  return (
    <div className="workflow-dashboard">
      <WorkflowControls onStart={start} isLoading={isLoading} />
      {state && (
        <>
          <OverallProgress state={state.overall} />
          <ResearchProgress state={state.research} />
          <DraftProgress state={state.draft} />
          <EditorialProgress state={state.editorial} />
        </>
      )}
      {error && <ErrorDisplay error={error} />}
    </div>
  );
}
```

## Development & Local Testing

When developing locally, the hooks will automatically connect to your local GenSX dev server:

```bash
# Start your GenSX dev server
cd your-gensx-project
npx gensx dev

# Your React app will connect to http://localhost:3787 by default
```

## Environment Detection

The hooks automatically detect whether you're using development or production based on the configuration:

- **Development**: When no `production` config is provided, defaults to local dev server
- **Production**: When `production` config is provided, uses GenSX API with authentication

```tsx
// Development - automatically connects to http://localhost:1337
const { start } = useAsyncWorkflow("/blog-writer");

// Production - uses GenSX API with org/project/environment
const { start } = useAsyncWorkflow("WriteBlog", {
  production: {
    org: "your-org",
    project: "blog-writer",
    environment: "default",
    apiKey: process.env.GENSX_API_KEY!,
  },
});
```

## Error Handling

All hooks provide comprehensive error handling:

```tsx
function WorkflowWithErrorHandling() {
  const { execute, error } = useWorkflow("/my-workflow");

  const handleExecute = async () => {
    try {
      await execute({ input: "data" });
    } catch (err) {
      // Error is also available in the error state
      console.error("Execution failed:", err);
    }
  };

  return (
    <div>
      <button onClick={handleExecute}>Execute</button>
      {error && (
        <div className="error">
          <h3>Workflow Error</h3>
          <p>{error.message}</p>
          <details>
            <summary>Stack Trace</summary>
            <pre>{error.stack}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
```

## Real-time State Updates

The state streaming uses Server-Sent Events and JSON Patch for efficient updates:

- **Initial state**: Receives full state object
- **Updates**: Receives only the changed parts via JSON Patch
- **Automatic reconnection**: Handles connection drops gracefully
- **Event filtering**: Can filter by state name for focused updates

```tsx
// The useWorkflowState hook automatically applies JSON patches
// You just work with the fully updated state object
const { data } = useWorkflowState<MyState>(executionId);

// State updates are efficient - only changed properties are transmitted
console.log(data?.research.completedTopics); // Always up-to-date
```

## Complete Usage Examples

### Development Environment

```tsx
import { useWorkflowWithState } from "@gensx/react";

function DevBlogWorkflow() {
  // No configuration needed - automatically connects to localhost:1337
  const { start, state, isLoading, error } = useWorkflowWithState(
    "/blog-writer",
    "blog",
  );

  const handleStart = () => {
    start({
      title: "AI Development in 2025",
      prompt: "Write about the latest AI developments",
    });
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isLoading}>
        {isLoading ? "Starting..." : "Start Blog Workflow"}
      </button>
      {state && <BlogProgress state={state} />}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### Production Environment

```tsx
import { useWorkflowWithState } from "@gensx/react";

function ProdBlogWorkflow() {
  const { start, state, isLoading, error } = useWorkflowWithState(
    "WriteBlog", // Note: workflow name, not path
    "blog",
    {
      production: {
        org: "acme-corp",
        project: "content-generator",
        environment: "production",
        apiKey: process.env.REACT_APP_GENSX_API_KEY!,
      },
    },
  );

  const handleStart = () => {
    start({
      title: "Machine Learning Trends",
      prompt: "Comprehensive analysis of ML trends",
      wordCount: 2000,
      referenceURL: "https://example.com/reference",
    });
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isLoading}>
        {isLoading ? "Generating..." : "Generate Blog Post"}
      </button>
      {state && <BlogProgress state={state} />}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### Environment-Aware Configuration

```tsx
import { useWorkflowWithState } from "@gensx/react";

function SmartBlogWorkflow() {
  // Automatically switch between dev and production
  const config =
    process.env.NODE_ENV === "production"
      ? {
          production: {
            org: process.env.REACT_APP_GENSX_ORG!,
            project: process.env.REACT_APP_GENSX_PROJECT!,
            environment: process.env.REACT_APP_GENSX_ENVIRONMENT!,
            apiKey: process.env.REACT_APP_GENSX_API_KEY!,
          },
        }
      : {}; // Empty for development

  const workflowName =
    process.env.NODE_ENV === "production" ? "WriteBlog" : "/blog-writer";

  const { start, state, isLoading, error } = useWorkflowWithState(
    workflowName,
    "blog",
    config,
  );

  return (
    <div>
      <p>Environment: {process.env.NODE_ENV}</p>
      <button onClick={() => start({ title: "Test", prompt: "Test prompt" })}>
        Start Workflow
      </button>
      {state && <BlogProgress state={state} />}
    </div>
  );
}
```

## License

Apache-2.0
