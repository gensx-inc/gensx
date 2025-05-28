import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

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
});
