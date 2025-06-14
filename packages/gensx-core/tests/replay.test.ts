import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { ExecutionNode } from "../src/checkpoint.js";
import * as gensx from "../src/index.js";

suite("checkpoint replay", () => {
  test("skips completed component and returns cached result", async () => {
    // Define a component that we'll simulate as already completed
    async function expensiveComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
      await setTimeout(10);
      return `processed: ${input}`;
    }

    const ExpensiveComponent = gensx.Component(
      "ExpensiveComponent",
      expensiveComponent,
    );

    // Create a mock checkpoint with a completed component
    const mockCheckpoint: ExecutionNode = {
      id: "root:TestWorkflow:e3b0c44298fc1c14",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      endTime: Date.now() - 500,
      props: { input: "test" },
      output: "workflow result",
      children: [
        {
          id: "root:TestWorkflow:e3b0c44298fc1c14:ExpensiveComponent:7d865e959b2466918c9863afca942d0f",
          componentName: "ExpensiveComponent",
          parentId: "root:TestWorkflow:e3b0c44298fc1c14",
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
    const startTime = Date.now();
    const result = await TestWorkflow(
      { input: "test" },
      { checkpoint: mockCheckpoint },
    );
    const endTime = Date.now();

    // Verify result is from cache
    expect(result).toBe("processed: test");

    // Verify it was fast (should be much less than the 10ms delay)
    expect(endTime - startTime).toBeLessThan(50);
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
      id: "root:TestWorkflow:e3b0c44298fc1c14",
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
    let newComponentExecuted = false;

    // Define components
    async function cachedComponent({
      input: _input,
    }: {
      input: string;
    }): Promise<string> {
      // This should not execute
      await setTimeout(0);
      throw new Error("Cached component should not execute");
    }

    async function newComponent({ input }: { input: string }): Promise<string> {
      newComponentExecuted = true;
      await setTimeout(0);
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

    // Verify mixed behavior
    expect(newComponentExecuted).toBe(true);
    expect(result).toBe("cached: test + new: test");
  });

  test("handles nested component hierarchy in replay", async () => {
    // Define nested components
    async function leafComponent({
      value,
    }: {
      value: string;
    }): Promise<string> {
      await setTimeout(0);
      return `leaf: ${value}`;
    }

    async function middleComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
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

    // Verify nested replay works
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
      await setTimeout(0);
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
      await setTimeout(0);
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
});
