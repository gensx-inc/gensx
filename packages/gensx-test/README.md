# GenSX Test Utilities ⚡️

Test utilities for GenSX.

## Getting started

Works with any test framework (Vitest, Jest, etc.).

```
pnpm add -D @gensx/test
```

## Usage

```ts
import { testComponentRunner } from "@gensx/test";

// Inside your test case
const { output, progressEvents } = await testComponentRunner(Editorial, {
  title: "Test Title",
  prompt: "Test Prompt",
  draft: "Test Draft",
  targetWordCount: 100,
});

// Or however your test framework works, and then you can assert expectations around the component output, and the progress events
expect(output).toMatchSnapshot();
expect(progressEvents).toMatchSnapshot();
```
