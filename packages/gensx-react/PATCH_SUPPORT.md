# JSON Patch Support in useObject Hook

## Overview

The `useObject` hook in `@gensx/react` has been updated to support the new JSON patch mechanism from `@gensx/core`. This provides significant performance improvements for streaming scenarios where objects are updated incrementally.

## Changes Made

### Before (Data-based)
```typescript
// Old WorkflowObjectMessage format
{
  type: "object",
  label: "user-profile",
  data: {
    name: "John",
    age: 31,
    preferences: { theme: "dark" }
  }
}
```

### After (Patch-based)
```typescript
// New WorkflowObjectMessage format
{
  type: "object",
  label: "user-profile",
  patches: [
    { op: "replace", path: "/age", value: 31 }
  ],
  isInitial: false
}
```

## How It Works

The updated `useObject` hook:

1. **Processes patches sequentially** - Applies each patch in order to reconstruct the object state
2. **Handles initial state** - When `isInitial: true`, starts with an empty object
3. **Supports extended operations** - Handles string-append and string-diff operations for efficient streaming
4. **Maintains state** - Keeps track of the current object state as patches are applied
5. **Error handling** - Gracefully handles invalid patches and continues with previous state

## Usage Examples

### Basic Usage
```tsx
import { useWorkflow, useObject } from '@gensx/react';

function MyComponent() {
  const workflow = useWorkflow({
    config: { baseUrl: '/api/workflow' },
    onComplete: (result) => console.log('Done:', result)
  });

  // Get the current state of an object from patches
  const userProfile = useObject(workflow.execution, 'user-profile');
  const streamingContent = useObject(workflow.execution, 'llm-response');

  return (
    <div>
      <h1>User: {userProfile?.name}</h1>
      <p>Age: {userProfile?.age}</p>
      <div>
        <h2>Streaming Response:</h2>
        <pre>{streamingContent?.content}</pre>
      </div>
    </div>
  );
}
```

### Streaming LLM Response Example
```tsx
function StreamingChat() {
  const workflow = useWorkflow({
    config: { baseUrl: '/api/chat' },
  });

  // This will efficiently handle streaming text updates
  const chatResponse = useObject(workflow.execution, 'chat-response');

  return (
    <div>
      <button onClick={() => workflow.run({ inputs: { message: 'Hello!' } })}>
        Send Message
      </button>
      
      {chatResponse && (
        <div className="chat-bubble">
          {chatResponse.content}
        </div>
      )}
    </div>
  );
}
```

## Supported Operations

The hook automatically handles all JSON patch operations:

### Standard JSON Patch Operations
- `add` - Add new properties
- `remove` - Remove properties
- `replace` - Replace property values
- `move` - Move properties
- `copy` - Copy properties
- `test` - Test property values

### Extended String Operations
- `string-append` - Efficiently append to strings (perfect for streaming)
- `string-diff` - Apply character-level diffs for complex string changes

## Performance Benefits

### Before (Full Object Updates)
```typescript
// Each update sends the complete object
publishObject('chat', { content: 'Hello' });          // 15 bytes
publishObject('chat', { content: 'Hello world' });    // 21 bytes
publishObject('chat', { content: 'Hello world!' });   // 22 bytes
// Total: 58 bytes
```

### After (Patch Updates)
```typescript
// Only changes are sent
publishObject('chat', { content: 'Hello' });          // Initial: 15 bytes
// Subsequent updates use patches:
// { op: 'string-append', path: '/content', value: ' world' }  // 8 bytes
// { op: 'string-append', path: '/content', value: '!' }       // 3 bytes
// Total: 26 bytes (55% reduction)
```

## Error Handling

The hook handles errors gracefully:

```typescript
// If a patch fails to apply, the hook:
// 1. Logs a warning to the console
// 2. Continues with the previous state
// 3. Doesn't crash the component

const userProfile = useObject(workflow.execution, 'user-profile');
// Will always return a valid object or undefined, never throws
```

## Migration Guide

### No Breaking Changes
The hook signature remains the same:
```typescript
function useObject<T = JsonValue>(
  events: WorkflowMessage[],
  label: string
): T | undefined
```

### Automatic Compatibility
The hook automatically detects the message format and handles both old and new formats transparently.

## Best Practices

1. **Use for streaming content** - Perfect for LLM responses, progress updates, etc.
2. **Leverage string operations** - The hook automatically optimizes string updates
3. **Handle undefined states** - Always check if the object exists before using it
4. **Use TypeScript** - Provide proper types for better development experience

```typescript
interface ChatResponse {
  content: string;
  timestamp: number;
  isComplete: boolean;
}

const chatResponse = useObject<ChatResponse>(workflow.execution, 'chat-response');
```

## Integration with Existing Code

The updated hook is fully backward compatible. Existing code using `useObject` will continue to work without modifications while automatically benefiting from the performance improvements when used with the new patch-based system.