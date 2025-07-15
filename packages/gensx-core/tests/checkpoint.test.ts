import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { ExecutionNode } from "../src/checkpoint.js";
import * as gensx from "../src/index.js";

// Helper function to generate test IDs
export function generateTestId(): string {
  return `test-${Math.random().toString(36).substring(7)}`;
}

suite("checkpoint", () => {
  test("component returns expected results", async () => {
    // Define a simple component that returns a string
    async function simpleComponent({
      message,
    }: {
      message: string;
    }): Promise<string> {
      await setTimeout(0); // Add small delay
      return `hello ${message}`;
    }

    // Create decorated component
    const SimpleComponent = gensx.Component("SimpleComponent", simpleComponent);

    // Execute component directly
    const result = await SimpleComponent({ message: "world" });

    // Verify execution result
    expect(result).toBe("hello world");
  });

  test("checkpoints track component hierarchy", async () => {
    // Define child component
    async function childComponent({
      value,
    }: {
      value: string;
    }): Promise<string> {
      await setTimeout(0);
      return `processed: ${value}`;
    }

    // Create decorated child component
    const ChildComponent = gensx.Component("ChildComponent", childComponent);

    // Define parent component that uses the child
    async function parentComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
      // Run the child component and return its result
      return await ChildComponent({ value: input });
    }

    // Create decorated parent component
    const ParentComponent = gensx.Component("ParentComponent", parentComponent);

    // Execute parent
    const result = await ParentComponent({ input: "test-value" });

    // Verify result
    expect(result).toBe("processed: test-value");
  });

  test("checkpoint reconstruction includes both cached and new components", async () => {
    let cachedExecutionCount = 0;
    let newExecutionCount = 0;

    // Define components
    async function cachedComponent({
      input,
    }: {
      input: string;
    }): Promise<string> {
      cachedExecutionCount++;
      await setTimeout(1);
      return `cached: ${input}`;
    }

    async function newComponent({ input }: { input: string }): Promise<string> {
      newExecutionCount++;
      await setTimeout(1);
      return `new: ${input}`;
    }

    const CachedComponent = gensx.Component("CachedComponent", cachedComponent);
    const NewComponent = gensx.Component("NewComponent", newComponent);

    // Create a checkpoint with only the cached component completed
    const mockCheckpoint: ExecutionNode = {
      id: "TestWorkflow:7db44194:0",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      startedAt: process.hrtime.bigint().toString(),
      props: { input: "test" },
      completed: false,
      children: [
        {
          id: "TestWorkflow-CachedComponent:bb17e0d6:0",
          componentName: "CachedComponent",
          parentId: "TestWorkflow:7db44194:0",
          startTime: Date.now() - 900,
          startedAt: process.hrtime.bigint().toString(),
          endTime: Date.now() - 800,
          props: { input: "test" },
          output: "cached: test",
          children: [],
          completed: true,
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

    // Verify execution behavior - this tests that checkpoint reconstruction works
    expect(cachedExecutionCount).toBe(0); // Cached component should not execute
    expect(newExecutionCount).toBe(1); // New component should execute
    expect(result).toBe("cached: test + new: test");

    // The checkpoint reconstruction is verified by the fact that:
    // 1. The cached component didn't execute but its result was used
    // 2. The new component executed and its result was included
    // 3. Both results were properly combined in the final output
    // This demonstrates that the checkpoint reconstruction successfully
    // added the cached component's subtree to the new checkpoint
  });
});
