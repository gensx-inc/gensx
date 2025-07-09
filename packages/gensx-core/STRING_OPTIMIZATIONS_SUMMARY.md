# String Optimization Extensions for JSON Patch

## Overview

This document details the string optimization extensions added to the JSON patch implementation in gensx-core. These optimizations are particularly valuable for LLM streaming scenarios where text is progressively appended to strings.

## New Operation Types

### 1. String Append Operation
```typescript
interface StringAppendOperation {
  op: "string-append";
  path: string;
  value: string;
}
```

**Use Case**: When a string value simply has text appended to it (e.g., streaming LLM responses)

**Example**:
```typescript
// Instead of: { op: "replace", path: "/content", value: "Hello world" }
// Uses: { op: "string-append", path: "/content", value: " world" }
```

### 2. String Diff Operation
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

**Use Case**: For complex string changes where character-level diffing is more efficient than full replacement

**Example**:
```typescript
// Instead of sending the entire new string
// Uses: { op: "string-diff", path: "/content", diff: [
//   { type: "retain", count: 5 },     // Keep first 5 characters
//   { type: "delete", count: 3 },     // Delete next 3 characters
//   { type: "insert", value: "new" }  // Insert new text
// ]}
```

## Automatic Optimization Logic

The system automatically chooses the most efficient operation based on the string change:

1. **String Append Detection**: 
   - Detects when new string starts with the old string
   - Uses `string-append` operation
   - Perfect for streaming scenarios

2. **String Diff Analysis**:
   - Calculates character-level diff for longer strings (>50 chars)
   - Uses `string-diff` only if it's more efficient than full replacement
   - Compares payload sizes to make the decision

3. **Fallback to Standard**:
   - Uses standard JSON Patch `replace` operation
   - Applied when optimizations don't provide benefits

## Benefits for Streaming Scenarios

### Before (Standard JSON Patch)
```typescript
// First message
publishObject('llm-response', { content: 'Hello' });
// Message: { patches: [{ op: 'add', path: '/content', value: 'Hello' }] }

// Second message  
publishObject('llm-response', { content: 'Hello world' });
// Message: { patches: [{ op: 'replace', path: '/content', value: 'Hello world' }] }
//          ^-- Sends entire string again (11 characters)
```

### After (With String Optimizations)
```typescript
// First message
publishObject('llm-response', { content: 'Hello' });
// Message: { patches: [{ op: 'add', path: '/content', value: 'Hello' }] }

// Second message
publishObject('llm-response', { content: 'Hello world' });
// Message: { patches: [{ op: 'string-append', path: '/content', value: ' world' }] }
//          ^-- Sends only the new text (6 characters)
```

## Performance Improvements

- **Reduced Bandwidth**: Only changes are transmitted
- **Faster Processing**: Smaller payloads mean faster parsing
- **Better UX**: Faster updates for streaming applications
- **Scalability**: Efficient for long-running streaming sessions

## Implementation Details

### Detection Algorithm
1. Check if it's a string `replace` operation
2. If yes, get the old string value
3. Check if new string starts with old string → use `string-append`
4. If not, calculate diff and compare payload sizes
5. Use most efficient operation

### Reconstruction
The `applyObjectPatches` function handles all operation types:
- Standard JSON Patch operations via `fast-json-patch`
- `string-append` operations by concatenating values
- `string-diff` operations by applying character-level changes

## Example Usage

```typescript
import { publishObject, applyObjectPatches } from '@gensx/core';

// Streaming LLM response scenario
publishObject('llm-stream', { response: 'The weather' });
publishObject('llm-stream', { response: 'The weather today' });     // string-append
publishObject('llm-stream', { response: 'The weather tomorrow' });  // string-diff or replace

// Reconstruction from patches
const currentState = {};
patches.forEach(patch => {
  currentState = applyObjectPatches([patch], currentState);
});
```

## Testing

Comprehensive tests verify:
- String append detection and application
- String diff calculation and application  
- Fallback to standard operations
- Mixed scenarios with multiple string fields
- Performance characteristics

All 136 tests pass, including 5 new tests specifically for string optimizations.