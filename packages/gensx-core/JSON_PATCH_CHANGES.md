# JSON Patch Implementation Summary

This document summarizes the changes made to implement JSON patch functionality in the `publishObject` helper in gensx-core.

## Overview

The `publishObject` function has been changed from sending the entire object every time to sending only the differences as JSON patches, following the JSON Patch specification (RFC 6902).

## Key Changes

### 1. Dependencies Added
- Added `fast-json-patch` (^3.1.1) to `package.json`
- This library provides JSON patch operations that conform to the RFC 6902 specification

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

### 4. New Utility Functions Added
- `clearObjectState(label: string)` - Clears state for a specific label
- `clearAllObjectStates()` - Clears all stored object states
- `applyObjectPatches(patches: Operation[], currentState: JsonValue)` - Reconstructs object state from patches

### 5. Test Updates
- Updated existing tests to expect JSON patches instead of complete objects
- Added comprehensive tests for JSON patch functionality including:
  - Initial publication creates patches
  - Subsequent publications only send changes
  - No message sent when object hasn't changed
  - State management functions work correctly

## Benefits

1. **Reduced Network Traffic**: Only changes are transmitted, not entire objects
2. **Improved Performance**: Smaller message payloads mean faster processing
3. **Better Scalability**: Less bandwidth usage for large objects with small changes
4. **Standards Compliance**: Uses the widely adopted JSON Patch specification

## Usage Example

```typescript
import { publishObject, applyObjectPatches } from '@gensx/core';

// First publication - sends complete object as patches
publishObject('user-data', {
  name: 'John',
  age: 30,
  city: 'New York'
});
// Message: {
//   type: 'object',
//   label: 'user-data',
//   patches: [
//     { op: 'add', path: '/name', value: 'John' },
//     { op: 'add', path: '/age', value: 30 },
//     { op: 'add', path: '/city', value: 'New York' }
//   ],
//   isInitial: true
// }

// Second publication - only sends changes
publishObject('user-data', {
  name: 'John',
  age: 31,  // Changed
  city: 'New York'
});
// Message: {
//   type: 'object',
//   label: 'user-data',
//   patches: [
//     { op: 'replace', path: '/age', value: 31 }
//   ],
//   isInitial: false
// }

// Reconstruct object from patches
const reconstructedObject = applyObjectPatches(patches, currentState);
```

## Breaking Changes

⚠️ **This is a breaking change** as the format of `WorkflowObjectMessage` has changed from containing `data` to containing `patches`. Consumers of the workflow messages will need to be updated to handle the new format.

## Backward Compatibility

No backward compatibility is maintained as per the requirements. All consumers must be updated to handle the new JSON patch format.