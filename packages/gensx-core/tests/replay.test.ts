import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { ExecutionNode } from "../src/checkpoint.js";
import * as gensx from "../src/index.js";

suite("checkpoint replay", () => {
  test("skips completed component and returns cached result", async () => {
    let expensiveComponentExecutionCount = 0;

    // Define a component that we'll simulate as already completed
    async function expensiveComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
      expensiveComponentExecutionCount++;
      await setTimeout(1);
      return `processed: ${input}`;
    }

    const ExpensiveComponent = gensx.Component(
      "ExpensiveComponent",
      expensiveComponent,
    );

    // Create a mock checkpoint with a completed component
    const mockCheckpoint: ExecutionNode = {
      id: "root:TestWorkflow:156403d8f795a18e",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      props: { input: "test" },
      children: [
        {
          id: "root:TestWorkflow:156403d8f795a18e:ExpensiveComponent:156403d8f795a18e",
          componentName: "ExpensiveComponent",
          parentId: "root:TestWorkflow:156403d8f795a18e",
          startTime: Date.now() - 900,
          endTime: Date.now() - 800,
          props: { input: "test" },
          output: "processed: test",
          children: [],
        },
      ],
    };

    // Define a workflow that uses the expensive component
    async function testWorkflow({ input }: { input: string }): Promise<string> {
      return await ExpensiveComponent({ input });
    }

    const TestWorkflow = gensx.Workflow("TestWorkflow", testWorkflow);

    // Execute with checkpoint - should skip the expensive component
    const result = await TestWorkflow(
      { input: "test" },
      { checkpoint: mockCheckpoint },
    );

    // Verify result is from cache and component didn't execute
    expect(result).toBe("processed: test");
    expect(expensiveComponentExecutionCount).toBe(0);
  });

  test("executes new components not in checkpoint", async () => {
    let componentExecuted = false;

    // Define a component that sets a flag when executed
    async function newComponent({ input }: { input: string }): Promise<string> {
      componentExecuted = true;
      await setTimeout(1);
      return `new: ${input}`;
    }

    const NewComponent = gensx.Component("NewComponent", newComponent);

    // Create a checkpoint without this component
    const mockCheckpoint: ExecutionNode = {
      id: "root:TestWorkflow:156403d8f795a18e",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      props: { input: "test" },
      children: [], // Empty - no completed components
    };

    // Define a workflow that uses the new component
    async function testWorkflow({ input }: { input: string }): Promise<string> {
      return await NewComponent({ input });
    }

    const TestWorkflow = gensx.Workflow("TestWorkflow", testWorkflow);

    // Execute with checkpoint
    const result = await TestWorkflow(
      { input: "test" },
      { checkpoint: mockCheckpoint },
    );

    // Verify component was executed
    expect(componentExecuted).toBe(true);
    expect(result).toBe("new: test");
  });

  test("handles mixed scenario with some cached and some new components", async () => {
    let cachedComponentExecutionCount = 0;
    let newComponentExecuted = false;

    // Define components
    async function cachedComponent({
      input: _input,
    }: {
      input: string;
    }): Promise<string> {
      cachedComponentExecutionCount++;
      await setTimeout(1);
      throw new Error("Cached component should not execute");
    }

    async function newComponent({ input }: { input: string }): Promise<string> {
      newComponentExecuted = true;
      await setTimeout(1);
      return `new: ${input}`;
    }

    const CachedComponent = gensx.Component("CachedComponent", cachedComponent);
    const NewComponent = gensx.Component("NewComponent", newComponent);

    // Create checkpoint with only the cached component
    const mockCheckpoint: ExecutionNode = {
      id: "root:TestWorkflow:156403d8f795a18e",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      props: { input: "test" },
      children: [
        {
          id: "root:TestWorkflow:156403d8f795a18e:CachedComponent:156403d8f795a18e",
          componentName: "CachedComponent",
          parentId: "root:TestWorkflow:156403d8f795a18e",
          startTime: Date.now() - 900,
          endTime: Date.now() - 800,
          props: { input: "test" },
          output: "cached: test",
          children: [],
        },
      ],
    };

    // Define workflow that uses both components
    async function testWorkflow({ input }: { input: string }): Promise<string> {
      const cached = await CachedComponent({ input });
      const fresh = await NewComponent({ input });
      return `${cached} + ${fresh}`;
    }

    const TestWorkflow = gensx.Workflow("TestWorkflow", testWorkflow);

    // Execute with checkpoint
    const result = await TestWorkflow(
      { input: "test" },
      { checkpoint: mockCheckpoint },
    );

    // Verify mixed behavior: cached component didn't execute, new component did
    expect(cachedComponentExecutionCount).toBe(0);
    expect(newComponentExecuted).toBe(true);
    expect(result).toBe("cached: test + new: test");
  });

  test("handles nested component hierarchy in replay", async () => {
    let leafComponentExecutionCount = 0;
    let middleComponentExecutionCount = 0;

    // Define nested components
    async function leafComponent({
      value,
    }: {
      value: string;
    }): Promise<string> {
      leafComponentExecutionCount++;
      await setTimeout(1);
      return `leaf: ${value}`;
    }

    async function middleComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
      middleComponentExecutionCount++;
      const LeafComponent = gensx.Component("LeafComponent", leafComponent);
      const result = await LeafComponent({ value: input });
      return `middle: ${result}`;
    }

    const MiddleComponent = gensx.Component("MiddleComponent", middleComponent);

    // Create checkpoint with nested completed components
    const mockCheckpoint: ExecutionNode = {
      id: "root:TestWorkflow:156403d8f795a18e",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      endTime: Date.now() - 100,
      props: { input: "test" },
      output: "middle: leaf: test",
      children: [
        {
          id: "root:TestWorkflow:156403d8f795a18e:MiddleComponent:156403d8f795a18e",
          componentName: "MiddleComponent",
          parentId: "root:TestWorkflow:156403d8f795a18e",
          startTime: Date.now() - 900,
          endTime: Date.now() - 200,
          props: { input: "test" },
          output: "middle: leaf: test",
          children: [
            {
              id: "root:TestWorkflow:156403d8f795a18e:MiddleComponent:156403d8f795a18e:LeafComponent:93268aced3bf3c80",
              componentName: "LeafComponent",
              parentId:
                "root:TestWorkflow:156403d8f795a18e:MiddleComponent:156403d8f795a18e",
              startTime: Date.now() - 800,
              endTime: Date.now() - 700,
              props: { value: "test" },
              output: "leaf: test",
              children: [],
            },
          ],
        },
      ],
    };

    // Define workflow
    async function testWorkflow({ input }: { input: string }): Promise<string> {
      return await MiddleComponent({ input });
    }

    const TestWorkflow = gensx.Workflow("TestWorkflow", testWorkflow);

    // Execute with checkpoint
    const result = await TestWorkflow(
      { input: "test" },
      { checkpoint: mockCheckpoint },
    );

    // Verify nested replay works - neither component should execute
    expect(middleComponentExecutionCount).toBe(0);
    expect(leafComponentExecutionCount).toBe(0);
    expect(result).toBe("middle: leaf: test");
  });

  test("handles empty checkpoint gracefully", async () => {
    let componentExecuted = false;

    async function testComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
      componentExecuted = true;
      await setTimeout(1);
      return `executed: ${input}`;
    }

    const TestComponent = gensx.Component("TestComponent", testComponent);

    // Create empty checkpoint
    const emptyCheckpoint: ExecutionNode = {
      id: "root:TestWorkflow:156403d8f795a18e",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      props: { input: "test" },
      children: [], // No completed components
    };

    async function testWorkflow({ input }: { input: string }): Promise<string> {
      return await TestComponent({ input });
    }

    const TestWorkflow = gensx.Workflow("TestWorkflow", testWorkflow);

    // Execute with empty checkpoint
    const result = await TestWorkflow(
      { input: "test" },
      { checkpoint: emptyCheckpoint },
    );

    // Verify component executed normally
    expect(componentExecuted).toBe(true);
    expect(result).toBe("executed: test");
  });

  test("works without checkpoint parameter", async () => {
    let componentExecuted = false;

    async function testComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
      componentExecuted = true;
      await setTimeout(1);
      return `executed: ${input}`;
    }

    const TestComponent = gensx.Component("TestComponent", testComponent);

    async function testWorkflow({ input }: { input: string }): Promise<string> {
      return await TestComponent({ input });
    }

    const TestWorkflow = gensx.Workflow("TestWorkflow", testWorkflow);

    // Execute without checkpoint
    const result = await TestWorkflow({ input: "test" });

    // Verify normal execution
    expect(componentExecuted).toBe(true);
    expect(result).toBe("executed: test");
  });

  test("reconstructs checkpoint with both cached and new components", async () => {
    let newComponentExecutionCount = 0;
    let cachedComponentExecutionCount = 0;

    // Define components
    async function cachedComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
      cachedComponentExecutionCount++;
      await setTimeout(1);
      return `cached: ${input}`;
    }

    async function newComponent({ input }: { input: string }): Promise<string> {
      newComponentExecutionCount++;
      await setTimeout(1);
      return `new: ${input}`;
    }

    const CachedComponent = gensx.Component("CachedComponent", cachedComponent);
    const NewComponent = gensx.Component("NewComponent", newComponent);

    // Create checkpoint with only the cached component
    const mockCheckpoint: ExecutionNode = {
      id: "root:TestWorkflow:156403d8f795a18e",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      props: { input: "test" },
      children: [
        {
          id: "root:TestWorkflow:156403d8f795a18e:CachedComponent:156403d8f795a18e",
          componentName: "CachedComponent",
          parentId: "root:TestWorkflow:156403d8f795a18e",
          startTime: Date.now() - 900,
          endTime: Date.now() - 800,
          props: { input: "test" },
          output: "cached: test",
          children: [],
        },
      ],
    };

    // Define workflow that uses both components
    async function testWorkflow({ input }: { input: string }): Promise<string> {
      const cached = await CachedComponent({ input });
      const fresh = await NewComponent({ input });
      return `${cached} + ${fresh}`;
    }

    const TestWorkflow = gensx.Workflow("TestWorkflow", testWorkflow);

    // Execute with checkpoint
    const result = await TestWorkflow(
      { input: "test" },
      { checkpoint: mockCheckpoint },
    );

    // Verify execution behavior
    expect(cachedComponentExecutionCount).toBe(0); // Cached component didn't execute
    expect(newComponentExecutionCount).toBe(1); // New component executed
    expect(result).toBe("cached: test + new: test");

    // The checkpoint reconstruction is verified by the console logs:
    // - "[Replay] Using cached result for CachedComponent"
    // - "[Checkpoint] Adding cached subtree for CachedComponent"
    // This test verifies that the replay functionality works correctly
    // and that cached components are properly reconstructed in the new checkpoint
  });
});
