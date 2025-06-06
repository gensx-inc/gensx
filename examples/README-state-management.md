# GenSX State Management

The GenSX state management system provides a powerful way to manage and stream structured state updates during workflow execution. This enables building rich frontend applications that can display real-time workflow progress with structured data.

## Overview

The state management system provides:

1. **Named State Objects**: Create typed state objects that persist across component calls
2. **Delta-based Updates**: Efficient JSON patch-based state updates
3. **Real-time Streaming**: State changes are automatically streamed via the progress system
4. **Type Safety**: Full TypeScript support for state objects

## Basic Usage

### Creating State

```typescript
import * as gensx from "@gensx/core";

interface ChatState {
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }>;
  isThinking: boolean;
}

const ChatComponent = gensx.Component("ChatComponent", async () => {
  // Create or get existing state
  const chatState = gensx.state<ChatState>("chatSession", {
    messages: [],
    isThinking: false,
  });

  // Update state
  chatState.update((state) => {
    state.messages.push({
      id: "msg-1",
      role: "user",
      content: "Hello!",
    });
    return state;
  });

  // Get current state
  const currentState = chatState.get();

  return currentState;
});
```

### State Operations

The state manager provides several operations:

```typescript
const state = gensx.state<MyType>("stateName", initialValue);

// Update with a function
state.update((currentState) => {
  // Mutate the state copy and return it
  currentState.someProperty = newValue;
  return currentState;
});

// Set entire state
state.set(newStateObject);

// Reset to initial value
state.reset();

// Get current state (always returns a copy)
const current = state.get();
```

## State Persistence

State persists across component calls within the same workflow execution:

```typescript
const CounterComponent = gensx.Component("Counter", async () => {
  const counter = gensx.state<{ count: number }>("counter", { count: 0 });

  counter.update((state) => {
    state.count += 1;
    return state;
  });

  return counter.get().count;
});

const TestWorkflow = gensx.Workflow("Test", async () => {
  const result1 = await CounterComponent(); // Returns 1
  const result2 = await CounterComponent(); // Returns 2
  const result3 = await CounterComponent(); // Returns 3

  return { result1, result2, result3 };
});
```

## Progress Events

State updates automatically generate progress events:

```typescript
const events: ProgressEvent[] = [];

await MyWorkflow(input, {
  progressListener: (event) => {
    if (event.type === "state-update") {
      console.log("State updated:", {
        stateName: event.stateName,
        patchOperations: event.patch.length,
        hasFullState: !!event.fullState,
      });
    }
  },
});
```

### State Update Event Structure

```typescript
interface StateUpdateEvent {
  type: "state-update";
  stateName: string;
  patch: Array<{
    op: "add" | "remove" | "replace" | "move" | "copy" | "test";
    path: string;
    value?: unknown;
    from?: string;
  }>;
  fullState?: unknown; // Only present for initial state
}
```

## Frontend Integration

### Server-Sent Events (SSE)

The GenSX dev server automatically streams state updates via SSE:

```javascript
// Connect to workflow with SSE
const eventSource = new EventSource("/workflows/myWorkflow", {
  headers: { Accept: "text/event-stream" },
});

eventSource.onmessage = (event) => {
  const progressEvent = JSON.parse(event.data);

  if (progressEvent.type === "state-update") {
    // Handle state update
    updateUIState(progressEvent.stateName, progressEvent.patch);
  }
};
```

### React Hook Example

```typescript
function useGensxState<T>(workflowUrl: string, stateName: string) {
  const [state, setState] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const eventSource = new EventSource(workflowUrl);

    eventSource.onmessage = (event) => {
      const progressEvent = JSON.parse(event.data);

      if (progressEvent.type === 'state-update' &&
          progressEvent.stateName === stateName) {

        if (progressEvent.fullState) {
          setState(progressEvent.fullState);
          setIsLoading(false);
        } else {
          setState(current => applyPatch(current, progressEvent.patch));
        }
      }
    };

    return () => eventSource.close();
  }, [workflowUrl, stateName]);

  return { state, isLoading };
}

// Usage in component
function ChatInterface() {
  const { state: chatState, isLoading } = useGensxState<ChatState>(
    '/workflows/chat',
    'chatSession'
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {chatState?.messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      {chatState?.isThinking && <div>🤔 Thinking...</div>}
    </div>
  );
}
```

## Advanced Patterns

### Multiple States

You can manage multiple named states in a single workflow:

```typescript
const MyWorkflow = gensx.Workflow("MultiState", async () => {
  const userState = gensx.state<UserState>("user", defaultUser);
  const appState = gensx.state<AppState>("app", defaultApp);

  // Update different states independently
  userState.update((state) => ({ ...state, name: "John" }));
  appState.update((state) => ({ ...state, theme: "dark" }));

  return { user: userState.get(), app: appState.get() };
});
```

### State with Complex Updates

```typescript
interface ChatState {
  messages: ChatMessage[];
  users: User[];
  metadata: {
    totalTokens: number;
    responseTime: number;
  };
}

const chatState = gensx.state<ChatState>("chat", initialState);

// Complex state update
chatState.update((state) => {
  // Add new message
  state.messages.push(newMessage);

  // Update metadata
  state.metadata.totalTokens += messageTokens;
  state.metadata.responseTime = Date.now() - startTime;

  // Update user status
  const user = state.users.find((u) => u.id === userId);
  if (user) {
    user.lastActive = new Date().toISOString();
  }

  return state;
});
```

## Best Practices

### 1. Use Descriptive State Names

```typescript
// Good
const chatState = gensx.state<ChatState>("chatSession", initialState);
const userProfile = gensx.state<UserProfile>("userProfile", defaultProfile);

// Avoid
const state1 = gensx.state<any>("state", {});
```

### 2. Initialize with Proper Defaults

```typescript
// Good - provides complete initial state
const chatState = gensx.state<ChatState>("chat", {
  messages: [],
  isThinking: false,
  currentUser: "",
  sessionId: generateId(),
});

// Avoid - incomplete initial state
const chatState = gensx.state<ChatState>("chat", {});
```

### 3. Keep State Updates Atomic

```typescript
// Good - single atomic update
chatState.update((state) => {
  state.messages.push(userMessage);
  state.isThinking = true;
  return state;
});

// Avoid - multiple separate updates
chatState.update((state) => {
  state.messages.push(userMessage);
  return state;
});
chatState.update((state) => {
  state.isThinking = true;
  return state;
});
```

### 4. Use TypeScript for Type Safety

```typescript
interface StrictChatState {
  messages: ChatMessage[];
  isThinking: boolean;
  metadata: {
    tokenCount: number;
    startTime: string;
  };
}

// TypeScript will enforce the structure
const chatState = gensx.state<StrictChatState>("chat", {
  messages: [],
  isThinking: false,
  metadata: {
    tokenCount: 0,
    startTime: new Date().toISOString(),
  },
});
```

## Performance Considerations

1. **State Size**: Keep state objects reasonably sized. Large objects will create larger JSON patches.

2. **Update Frequency**: State updates are synchronous but generate events. Avoid excessive updates in tight loops.

3. **JSON Serialization**: Avoid non-serializable objects (functions, circular references, etc.) in state.

4. **Frontend Optimization**: Use proper JSON patch libraries on the frontend for efficient state application.

## Debugging

### Viewing State Updates

```typescript
await MyWorkflow(input, {
  progressListener: (event) => {
    if (event.type === "state-update") {
      console.log(`State "${event.stateName}" updated:`, {
        operations: event.patch.length,
        patch: event.patch,
        fullState: event.fullState,
      });
    }
  },
});
```

### Inspecting Current States

```typescript
import { getAllStates } from "@gensx/core";

// Get all current states (useful for debugging)
const allStates = getAllStates();
console.log("Current states:", allStates);
```

## Migration from Progress Events

If you're currently using `emitProgress` for state-like updates:

```typescript
// Old approach
gensx.emitProgress({
  type: "chat-update",
  messages: JSON.stringify(messages),
  isThinking: "true",
});

// New approach
const chatState = gensx.state<ChatState>("chat", initialState);
chatState.update((state) => {
  state.messages = messages;
  state.isThinking = true;
  return state;
});
```

The new state management system provides better type safety, automatic delta computation, and easier frontend integration.
