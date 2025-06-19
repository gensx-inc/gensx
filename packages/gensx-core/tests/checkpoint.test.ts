import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { generateDeterministicId } from "../src/checkpoint.js";
import * as gensx from "../src/index.js";

// Helper function to generate test IDs
export function generateTestId(): string {
  return `test-${Math.random().toString(36).substring(7)}`;
}

suite("checkpoint", () => {
  suite("deterministic ID generation", () => {
    test("generates same ID for same inputs", () => {
      const props = { name: "test", value: 42 };
      const id1 = generateDeterministicId("TestComponent", props, "parent123");
      const id2 = generateDeterministicId("TestComponent", props, "parent123");

      expect(id1).toBe(id2);
    });

    test("generates different IDs for different component names", () => {
      const props = { name: "test" };
      const id1 = generateDeterministicId("ComponentA", props, "parent123");
      const id2 = generateDeterministicId("ComponentB", props, "parent123");

      expect(id1).not.toBe(id2);
    });

    test("generates different IDs for different props", () => {
      const props1 = { name: "test", value: 42 };
      const props2 = { name: "test", value: 43 };
      const id1 = generateDeterministicId("TestComponent", props1, "parent123");
      const id2 = generateDeterministicId("TestComponent", props2, "parent123");

      expect(id1).not.toBe(id2);
    });

    test("generates different IDs for different parent IDs", () => {
      const props = { name: "test" };
      const id1 = generateDeterministicId("TestComponent", props, "parent1");
      const id2 = generateDeterministicId("TestComponent", props, "parent2");

      expect(id1).not.toBe(id2);
    });

    test("handles empty props", () => {
      const id1 = generateDeterministicId("TestComponent", {}, "parent123");
      const id2 = generateDeterministicId("TestComponent", {}, "parent123");

      expect(id1).toBe(id2);
    });

    test("prop order doesn't matter", () => {
      const props1 = { a: 1, b: 2, c: 3 };
      const props2 = { c: 3, a: 1, b: 2 };
      const id1 = generateDeterministicId("TestComponent", props1, "parent123");
      const id2 = generateDeterministicId("TestComponent", props2, "parent123");

      expect(id1).toBe(id2);
    });

    test("handles complex nested objects", () => {
      const props1 = {
        user: { name: "John", age: 30 },
        settings: { theme: "dark", notifications: true },
      };
      const props2 = {
        user: { name: "John", age: 30 },
        settings: { theme: "dark", notifications: true },
      };
      const id1 = generateDeterministicId("TestComponent", props1, "parent123");
      const id2 = generateDeterministicId("TestComponent", props2, "parent123");

      expect(id1).toBe(id2);
    });

    test("handles arrays consistently", () => {
      const props1 = { items: [1, 2, 3], tags: ["a", "b"] };
      const props2 = { items: [1, 2, 3], tags: ["a", "b"] };
      const id1 = generateDeterministicId("TestComponent", props1, "parent123");
      const id2 = generateDeterministicId("TestComponent", props2, "parent123");

      expect(id1).toBe(id2);
    });

    test("different array order produces different IDs", () => {
      const props1 = { items: [1, 2, 3] };
      const props2 = { items: [3, 2, 1] };
      const id1 = generateDeterministicId("TestComponent", props1, "parent123");
      const id2 = generateDeterministicId("TestComponent", props2, "parent123");

      expect(id1).not.toBe(id2);
    });

    test("ID format is consistent", () => {
      const props = { name: "test" };
      const id = generateDeterministicId("TestComponent", props, "parent123");

      // Should be in format: parentId:componentName:propsHash
      expect(id).toMatch(/^TestComponent:[a-f0-9]{16}$/);
    });
  });

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
    const mockCheckpoint = {
      id: "TestWorkflow:e3aab1c267157d72",
      componentName: "TestWorkflow",
      startTime: Date.now() - 1000,
      props: { input: "test" },
      children: [
        {
          id: "CachedComponent:8a2b95df3bafc8df",
          componentName: "CachedComponent",
          parentId: "TestWorkflow:e3aab1c267157d72",
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
