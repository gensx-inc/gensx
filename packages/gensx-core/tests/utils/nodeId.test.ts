import { expect, suite, test } from "vitest";

import { generateNodeId } from "../../src/utils/nodeId.js";

suite("node ID generation", () => {
  test("generates same ID for same inputs", () => {
    const props = { name: "test", value: 42 };
    const id1 = generateNodeId("TestComponent", props, undefined, "parent123");
    const id2 = generateNodeId("TestComponent", props, undefined, "parent123");

    expect(id1).toBe(id2);
  });

  test("generates different IDs for different component names", () => {
    const props = { name: "test" };
    const id1 = generateNodeId("ComponentA", props, undefined, "parent123");
    const id2 = generateNodeId("ComponentB", props, undefined, "parent123");

    expect(id1).not.toBe(id2);
  });

  test("generates different IDs for different props", () => {
    const props1 = { name: "test", value: 42 };
    const props2 = { name: "test", value: 43 };
    const id1 = generateNodeId("TestComponent", props1, undefined, "parent123");
    const id2 = generateNodeId("TestComponent", props2, undefined, "parent123");

    expect(id1).not.toBe(id2);
  });

  test("generates different IDs for different parent IDs", () => {
    const props = { name: "test" };
    const id1 = generateNodeId("TestComponent", props, undefined, "parent1");
    const id2 = generateNodeId("TestComponent", props, undefined, "parent2");

    expect(id1).not.toBe(id2);
  });

  test("handles empty props", () => {
    const id1 = generateNodeId("TestComponent", {}, undefined, "parent123");
    const id2 = generateNodeId("TestComponent", {}, undefined, "parent123");

    expect(id1).toBe(id2);
  });

  test("prop order doesn't matter", () => {
    const props1 = { a: 1, b: 2, c: 3 };
    const props2 = { c: 3, a: 1, b: 2 };
    const id1 = generateNodeId("TestComponent", props1, undefined, "parent123");
    const id2 = generateNodeId("TestComponent", props2, undefined, "parent123");

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
    const id1 = generateNodeId("TestComponent", props1, undefined, "parent123");
    const id2 = generateNodeId("TestComponent", props2, undefined, "parent123");

    expect(id1).toBe(id2);
  });

  test("filters out idPropsKeys", () => {
    const props = { name: "test", value: 42 };
    const id1 = generateNodeId("TestComponent", props, ["value"], "parent123");
    const id2 = generateNodeId("TestComponent", props, undefined, "parent123");
    expect(id1).not.toBe(id2);
  });

  test("handles arrays consistently", () => {
    const props1 = { items: [1, 2, 3], tags: ["a", "b"] };
    const props2 = { items: [1, 2, 3], tags: ["a", "b"] };
    const id1 = generateNodeId("TestComponent", props1, undefined, "parent123");
    const id2 = generateNodeId("TestComponent", props2, undefined, "parent123");

    expect(id1).toBe(id2);
  });

  test("different array order produces different IDs", () => {
    const props1 = { items: [1, 2, 3] };
    const props2 = { items: [3, 2, 1] };
    const id1 = generateNodeId("TestComponent", props1, undefined, "parent123");
    const id2 = generateNodeId("TestComponent", props2, undefined, "parent123");

    expect(id1).not.toBe(id2);
  });

  test("ID format is consistent", () => {
    const props = { name: "test" };
    const id = generateNodeId("TestComponent", props, undefined, "parent123");

    // Should be in format: parentId:componentName:propsHash
    expect(id).toMatch(/^parent123-TestComponent:[a-f0-9]{8}:0$/);
  });
});
