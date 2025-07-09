# JSON Patch Implementation with String Optimizations

This document summarizes the changes made to implement JSON patch functionality with advanced string optimizations in the `publishObject` helper in gensx-core.

## Overview

The `publishObject` function has been changed from sending the entire object every time to sending only the differences as JSON patches, following the JSON Patch specification (RFC 6902). Additionally, special optimizations have been implemented for string values to handle streaming scenarios efficiently.

## Key Changes

### 1. Dependencies Added
- Added `fast-json-patch` (^3.1.1) to `package.json`
  - This library provides JSON patch operations that conform to the RFC 6902 specification
- Added `diff` (^5.1.0) to `package.json`
  - This library provides character-level diffing for string optimization
- Added `@types/diff` (^5.0.9) to dev dependencies for TypeScript support

### 2. WorkflowObjectMessage Type Updated
**Before:**
```typescript
export interface WorkflowObjectMessage {
  type: "object";
  data: JsonValue;
  label: string;
}
```

**After:**
```typescript
export interface WorkflowObjectMessage {
  type: "object";
  label: string;
  patches: Operation[];
  isInitial?: boolean;
}
```

### 3. publishObject Function Rewritten
The function now:
- Stores the current state of published objects in a module-level `objectStateMap`
- Compares new data with previously published data
- Generates JSON patches showing only the differences
- Sends patches instead of complete objects
- Includes an `isInitial` flag for the first publication
- Skips sending messages when no changes are detected

### 4. Extended Operation Types for String Optimization
Added new operation types that extend the standard JSON Patch specification:

**StringAppendOperation:**
```typescript
interface StringAppendOperation {
  op: "string-append";
  path: string;
  value: string;
}
```

**StringDiffOperation:**
```typescript
interface StringDiffOperation {
  op: "string-diff";
  path: string;
  diff: Array<{
    type: "retain" | "insert" | "delete";
    count?: number;
    value?: string;
  }>;
}
```

### 5. Intelligent String Optimization Logic
The `publishObject` function now automatically detects string changes and applies optimizations:

1. **String Append Detection**: When a string value simply has text appended (common in streaming scenarios), it uses `string-append` operation
2. **String Diff Analysis**: For more complex string changes on longer strings (>50 chars), it calculates a character-level diff and uses `string-diff` if it's more efficient than a full replacement
3. **Fallback to Standard**: Falls back to standard JSON Patch `replace` operation when optimizations don't provide benefits

### 6. New Utility Functions Added
- `clearObjectState(label: string)` - Clears state for a specific label
- `clearAllObjectStates()` - Clears all stored object states
- `applyObjectPatches(patches: Operation[], currentState: JsonValue)` - Reconstructs object state from patches (handles both standard and extended operations)

### 7. Test Updates
- Updated existing tests to expect JSON patches instead of complete objects
- Added comprehensive tests for JSON patch functionality including:
  - Initial publication creates patches
  - Subsequent publications only send changes
  - No message sent when object hasn't changed
  - State management functions work correctly
- Added tests for string optimization operations:
  - String append detection and handling
  - String diff operations
  - Fallback to standard operations
  - Mixed optimization scenarios

## Benefits

1. **Reduced Network Traffic**: Only changes are transmitted, not entire objects
2. **Improved Performance**: Smaller message payloads mean faster processing
3. **Better Scalability**: Less bandwidth usage for large objects with small changes
4. **Standards Compliance**: Uses the widely adopted JSON Patch specification
5. **Streaming Optimizations**: Highly efficient for LLM streaming scenarios where text is incrementally appended
6. **Intelligent Optimization**: Automatically chooses the most efficient representation for string changes

## Usage Example

```typescript
import { publishObject, applyObjectPatches } from '@gensx/core';

// First publication - sends complete object as patches
publishObject('streaming-content', {
  title: 'AI Response',
  content: 'Hello'
});
// Message: {
//   type: 'object',
//   label: 'streaming-content',
//   patches: [
//     { op: 'add', path: '/title', value: 'AI Response' },
//     { op: 'add', path: '/content', value: 'Hello' }
//   ],
//   isInitial: true
// }

// Second publication - string append optimization
publishObject('streaming-content', {
  title: 'AI Response',
  content: 'Hello world'  // Appended " world"
});
// Message: {
//   type: 'object',
//   label: 'streaming-content',
//   patches: [
//     { op: 'string-append', path: '/content', value: ' world' }
//   ],
//   isInitial: false
// }

// Third publication - more complex string change
publishObject('streaming-content', {
  title: 'AI Response',
  content: 'Hello universe! This is a longer response that demonstrates string diffing.'
});
// Message: {
//   type: 'object',
//   label: 'streaming-content',
//   patches: [
//     { 
//       op: 'string-diff', 
//       path: '/content', 
//       diff: [
//         { type: 'retain', count: 5 },  // Keep "Hello"
//         { type: 'delete', count: 6 },  // Delete " world"
//         { type: 'insert', value: ' universe! This is a longer response that demonstrates string diffing.' }
//       ]
//     }
//   ],
//   isInitial: false
// }

// Reconstruct object from patches
const reconstructedObject = applyObjectPatches(patches, currentState);
```

### String Optimization Scenarios

1. **Streaming Text (String Append)**: Perfect for LLM streaming where tokens are progressively added
2. **String Diff**: Efficient for longer strings with complex changes
3. **Fallback**: Uses standard JSON Patch for short strings or when optimizations don't help

## Breaking Changes

⚠️ **This is a breaking change** as the format of `WorkflowObjectMessage` has changed from containing `data` to containing `patches`. Consumers of the workflow messages will need to be updated to handle the new format.

## Backward Compatibility

No backward compatibility is maintained as per the requirements. All consumers must be updated to handle the new JSON patch format.