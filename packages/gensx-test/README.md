# GenSX Test Utilities ⚡️

Test utilities for GenSX.

## Getting started

Works with any test framework (Vitest, Jest, etc.).

```bash
pnpm add -D @gensx/test
```

## Usage

```ts
import { testComponentRunner } from "@gensx/test";

// Inside your test case
const { output, progressEvents } = await testComponentRunner(MyComponent, {
  input: "foo",
});

// Or however your test framework works, and then you can assert expectations around the component output, and the progress events
expect(output).toEqual("HELLO");
expect(progressEvents).toHaveLength(8);
```

Example progress events:

```json
[
  {
    "type": "start",g
    "workflowName": "TestComponentWorkflow"
  },
  {
    "type": "component-start",
    "componentName": "TestComponentWorkflow",
    "componentId": "3a688dc7-a8e9-4088-8ccb-58380fbc41c1"
  },
  {
    "type": "component-start",
    "componentName": "TestComponent",
    "componentId": "18cee7d2-34bf-45f8-8c04-c6c357101320"
  },
  {
    "type": "component-start",
    "componentName": "NestedComponent",
    "componentId": "b97e3c7d-b0f4-4f82-8cb4-35de1901499f"
  },
  {
    "type": "component-end",
    "componentName": "NestedComponent",
    "componentId": "b97e3c7d-b0f4-4f82-8cb4-35de1901499f"
  },
  {
    "type": "component-end",
    "componentName": "TestComponent",
    "componentId": "18cee7d2-34bf-45f8-8c04-c6c357101320"
  },
  {
    "type": "component-end",
    "componentName": "TestComponentWorkflow",
    "componentId": "3a688dc7-a8e9-4088-8ccb-58380fbc41c1"
  },
  { "type": "end" }
]
```
