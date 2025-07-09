/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  WorkflowMessage,
  WorkflowMessageListener,
} from "src/workflow-state.js";
import { beforeEach, expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { getValueByJsonPath } from "../src/workflow-state.js";

suite("workflow state", () => {
  beforeEach(() => {
    // Clear all object states before each test
    gensx.clearAllObjectStates();
  });
  test("can emit workflow messages from components", async () => {
    const events: WorkflowMessage[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.publishData("Test progress message");
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      messageListener,
    });

    expect(events).toHaveLength(7);
    expect(events[0]).toEqual({
      type: "start",
      workflowName: "TestWorkflow",
    });
    expect(events[1]).toEqual({
      type: "component-start",
      componentName: "TestWorkflow",
      componentId: expect.any(String),
    });
    expect(events[2]).toEqual({
      type: "component-start",
      componentName: "TestComponent",
      componentId: expect.any(String),
    });
    expect(events[3]).toEqual({
      type: "data",
      data: "Test progress message",
    });
    expect(events[4]).toEqual({
      type: "component-end",
      componentName: "TestComponent",
      componentId: expect.any(String),
    });
    expect(events[5]).toEqual({
      type: "component-end",
      componentName: "TestWorkflow",
      componentId: expect.any(String),
    });
    expect(events[6]).toEqual({
      type: "end",
    });
  });

  test("can emit workflow messages with custom properties", async () => {
    const events: WorkflowMessage[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.publishData({
        doing: "Custom progress",
        status: "in-progress",
      });
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      messageListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "data",
      data: {
        doing: "Custom progress",
        status: "in-progress",
      },
    });
  });

  test("can emit workflow messages with nested objects", async () => {
    const events: WorkflowMessage[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.publishData({
        task: "Processing data",
        details: {
          stage: "validation",
          substage: {
            name: "schema check",
            progress: 0.5,
          },
          metadata: {
            startTime: "2024-01-01T00:00:00Z",
            estimatedCompletion: null,
            isComplete: false,
          },
        },
        items: ["item1", "item2", "item3"],
      });
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      messageListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "data",
      data: {
        task: "Processing data",
        details: {
          stage: "validation",
          substage: {
            name: "schema check",
            progress: 0.5,
          },
          metadata: {
            startTime: "2024-01-01T00:00:00Z",
            estimatedCompletion: null,
            isComplete: false,
          },
        },
        items: ["item1", "item2", "item3"],
      },
    });
  });

  test("can emit workflow messages with various JSON types", async () => {
    const events: WorkflowMessage[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();

      // Test string
      gensx.publishData("Simple string message");

      // Test number
      gensx.publishData(42);

      // Test boolean
      gensx.publishData(true);

      // Test null
      gensx.publishData(null);

      // Test array
      gensx.publishData([1, "two", { three: 3 }, [4, 5]]);

      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      messageListener,
    });

    expect(events).toHaveLength(11); // start, component-start, component-start, 5 progress events, component-end, component-end, end

    // Check each progress event
    expect(events[3]).toEqual({
      type: "data",
      data: "Simple string message",
    });

    expect(events[4]).toEqual({
      type: "data",
      data: 42,
    });

    expect(events[5]).toEqual({
      type: "data",
      data: true,
    });

    expect(events[6]).toEqual({
      type: "data",
      data: null,
    });

    expect(events[7]).toEqual({
      type: "data",
      data: [1, "two", { three: 3 }, [4, 5]],
    });
  });

  test("can emit workflow messages with deeply nested structures", async () => {
    const events: WorkflowMessage[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.publishData({
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  message: "Deep nesting works!",
                  numbers: [1, 2, 3],
                  config: {
                    enabled: true,
                    settings: {
                      threshold: 0.95,
                      options: ["opt1", "opt2"],
                    },
                  },
                },
              },
            },
          },
        },
      });
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      messageListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "data",
      data: {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  message: "Deep nesting works!",
                  numbers: [1, 2, 3],
                  config: {
                    enabled: true,
                    settings: {
                      threshold: 0.95,
                      options: ["opt1", "opt2"],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  test("JSON serialization/deserialization preserves data integrity", async () => {
    const events: WorkflowMessage[] = [];

    const complexData = {
      string: "hello world",
      number: 123.45,
      boolean: true,
      nullValue: null,
      array: [1, "two", { nested: "object" }],
      object: {
        nested: {
          deeply: {
            embedded: "value",
            settings: {
              config: true,
              items: ["a", "b", "c"],
            },
          },
        },
      },
    };

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.publishData(complexData);
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);

      // Simulate what happens in the Redis backend:
      // 1. Serialize the data to a JSON string
      // 2. Deserialize it back to verify integrity
      if (event.type === "data") {
        const serialized = JSON.stringify(event.data);
        const deserialized = JSON.parse(serialized);

        // Verify that serialization/deserialization preserves the data
        expect(deserialized).toEqual(complexData);
      }
    };

    await TestWorkflow(undefined, {
      messageListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "data",
      data: complexData,
    });
  });

  test("emits error events when component fails", async () => {
    const events: WorkflowMessage[] = [];

    const ErrorComponent = gensx.Component("ErrorComponent", async () => {
      await Promise.resolve();
      throw new Error("Test error");
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await ErrorComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    try {
      await TestWorkflow(undefined, {
        messageListener,
      });
    } catch (_error) {
      // Expected error
    }

    expect(
      events.some(
        (e) =>
          e.type === "error" &&
          typeof e.error === "string" &&
          e.error.includes("Test error"),
      ),
    ).toBe(true);
  });

  test("emits workflow messages for streaming components", async () => {
    const events: WorkflowMessage[] = [];

    const StreamingComponent = gensx.Component(
      "StreamingComponent",
      async function* () {
        await Promise.resolve();
        gensx.publishData("Starting stream");
        yield "chunk1";
        await Promise.resolve();
        gensx.publishData("Middle of stream");
        yield "chunk2";
        await Promise.resolve();
        gensx.publishData("End of stream");
      },
    );

    const TestWorkflow = gensx.Workflow("TestWorkflow", () => {
      return StreamingComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    const stream = await TestWorkflow(undefined, {
      messageListener,
    });

    let content = "";
    for await (const chunk of stream) {
      content += chunk;
    }

    expect(content).toBe("chunk1chunk2");
    expect(events).toHaveLength(9);
    expect(events[3]).toEqual({
      type: "data",
      data: "Starting stream",
    });
    expect(events[4]).toEqual({
      type: "data",
      data: "Middle of stream",
    });
    expect(events[5]).toEqual({
      type: "data",
      data: "End of stream",
    });
  });

  test("supports workflow execution ID in workflow messages", async () => {
    const events: WorkflowMessage[] = [];

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      await Promise.resolve();
      return "done";
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      messageListener,
      workflowExecutionId: "test-execution-123",
    });

    expect(events[0]).toEqual({
      type: "start",
      workflowName: "TestWorkflow",
      workflowExecutionId: "test-execution-123",
    });
  });

  test("can publish an event to the workflow message stream", async () => {
    const events: WorkflowMessage[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.publishEvent("test-event", {
        bag: "of",
        things: ["a", "b", "c"],
      });
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      messageListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "event",
      label: "test-event",
      data: {
        bag: "of",
        things: ["a", "b", "c"],
      },
    });
  });

  test("can publish state to the workflow message stream", async () => {
    const events: WorkflowMessage[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.publishObject("test-state", {
        bag: "of",
        things: ["a", "b", "c"],
      });
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const messageListener: WorkflowMessageListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      messageListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "object",
      label: "test-state",
      patches: [
        { op: "add", path: "/bag", value: "of" },
        { op: "add", path: "/things", value: ["a", "b", "c"] },
      ],
      isInitial: true,
    });
  });

  suite("createEventStream", () => {
    test("can use event stream in components", async () => {
      const events: WorkflowMessage[] = [];

      const testEventStream = gensx.createEventStream("test-event");
      const TestComponent = gensx.Component("TestComponent", async () => {
        await Promise.resolve();
        testEventStream({
          bag: "of",
          things: ["a", "b", "c"],
        });
        return "done";
      });

      const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
        await TestComponent();
      });

      const messageListener: WorkflowMessageListener = (event) => {
        events.push(event);
      };

      await TestWorkflow(undefined, {
        messageListener,
      });

      expect(events).toHaveLength(7);
      expect(events[3]).toEqual({
        type: "event",
        label: "test-event",
        data: {
          bag: "of",
          things: ["a", "b", "c"],
        },
      });
    });
  });

  suite("createObjectStream", () => {
    test("can use object stream in components", async () => {
      const events: WorkflowMessage[] = [];

      const testWorkflowState = gensx.createObjectStream("test-state");
      const TestComponent = gensx.Component("TestComponent", async () => {
        await Promise.resolve();
        testWorkflowState({
          bag: "of",
          things: ["a", "b", "c"],
        });
      });

      const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
        await TestComponent();
      });

      const messageListener: WorkflowMessageListener = (event) => {
        events.push(event);
      };

      await TestWorkflow(undefined, {
        messageListener,
      });

      expect(events).toHaveLength(7);
      expect(events[3]).toEqual({
        type: "object",
        label: "test-state",
        patches: [
          { op: "add", path: "/bag", value: "of" },
          { op: "add", path: "/things", value: ["a", "b", "c"] },
        ],
        isInitial: true,
      });
    });
  });

  suite("publishObject JSON patches", () => {
    test("first publication creates initial patches", async () => {
      const events: WorkflowMessage[] = [];

      const TestComponent = gensx.Component("TestComponent", async () => {
        await Promise.resolve();
        gensx.publishObject("test-state", {
          name: "John",
          age: 30,
          address: {
            city: "New York",
            zip: "10001",
          },
        });
        return "done";
      });

      const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
        return await TestComponent();
      });

      const messageListener: WorkflowMessageListener = (event) => {
        events.push(event);
      };

      await TestWorkflow(undefined, {
        messageListener,
      });

      expect(events).toHaveLength(7);
      const objectMessage = events[3] as gensx.WorkflowObjectMessage;
      expect(objectMessage.type).toBe("object");
      expect(objectMessage.label).toBe("test-state");
      expect(objectMessage.isInitial).toBe(true);
      expect(objectMessage.patches).toEqual([
        { op: "add", path: "/name", value: "John" },
        { op: "add", path: "/age", value: 30 },
        {
          op: "add",
          path: "/address",
          value: { city: "New York", zip: "10001" },
        },
      ]);
    });

    test("subsequent publications only send changed parts", async () => {
      const events: WorkflowMessage[] = [];

      const TestComponent = gensx.Component("TestComponent", async () => {
        await Promise.resolve();

        // First publication
        gensx.publishObject("test-state", {
          name: "John",
          age: 30,
          address: {
            city: "New York",
            zip: "10001",
          },
        });

        // Second publication - only change age
        gensx.publishObject("test-state", {
          name: "John",
          age: 31,
          address: {
            city: "New York",
            zip: "10001",
          },
        });

        return "done";
      });

      const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
        return await TestComponent();
      });

      const messageListener: WorkflowMessageListener = (event) => {
        events.push(event);
      };

      await TestWorkflow(undefined, {
        messageListener,
      });

      expect(events).toHaveLength(8); // Extra event for the second publication

      // First publication should be initial
      const firstMessage = events[3] as gensx.WorkflowObjectMessage;
      expect(firstMessage.type).toBe("object");
      expect(firstMessage.isInitial).toBe(true);

      // Second publication should only contain the changed field
      const secondMessage = events[4] as gensx.WorkflowObjectMessage;
      expect(secondMessage.type).toBe("object");
      expect(secondMessage.isInitial).toBe(false);
      expect(secondMessage.patches).toEqual([
        { op: "replace", path: "/age", value: 31 },
      ]);
    });

    test("no event is sent when object state hasn't changed", async () => {
      const events: WorkflowMessage[] = [];

      const TestComponent = gensx.Component("TestComponent", async () => {
        await Promise.resolve();

        // First publication
        gensx.publishObject("test-state", {
          name: "John",
          age: 30,
        });

        // Second publication - same data
        gensx.publishObject("test-state", {
          name: "John",
          age: 30,
        });

        return "done";
      });

      const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
        return await TestComponent();
      });

      const messageListener: WorkflowMessageListener = (event) => {
        events.push(event);
      };

      await TestWorkflow(undefined, {
        messageListener,
      });

      expect(events).toHaveLength(7); // No extra event for the second publication
    });
  });

  suite("object state management", () => {
    test("clearObjectState removes state for a specific label", async () => {
      const events: WorkflowMessage[] = [];

      const TestComponent = gensx.Component("TestComponent", async () => {
        await Promise.resolve();

        // First publication
        gensx.publishObject("test-state", { name: "John" });

        // Clear the state
        gensx.clearObjectState("test-state");

        // Second publication - should be treated as initial again
        gensx.publishObject("test-state", { name: "Jane" });

        return "done";
      });

      const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
        return await TestComponent();
      });

      const messageListener: WorkflowMessageListener = (event) => {
        events.push(event);
      };

      await TestWorkflow(undefined, {
        messageListener,
      });

      expect(events).toHaveLength(8); // Two object events

      // First publication should be initial
      const firstMessage = events[3] as gensx.WorkflowObjectMessage;
      expect(firstMessage.isInitial).toBe(true);

      // Second publication should also be initial since we cleared the state
      const secondMessage = events[4] as gensx.WorkflowObjectMessage;
      expect(secondMessage.isInitial).toBe(true);
    });

    test("clearAllObjectStates removes all stored states", async () => {
      const events: WorkflowMessage[] = [];

      const TestComponent = gensx.Component("TestComponent", async () => {
        await Promise.resolve();

        // First publications
        gensx.publishObject("state1", { name: "John" });
        gensx.publishObject("state2", { name: "Jane" });

        // Clear all states
        gensx.clearAllObjectStates();

        // Second publications - should be treated as initial again
        gensx.publishObject("state1", { name: "Bob" });
        gensx.publishObject("state2", { name: "Alice" });

        return "done";
      });

      const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
        return await TestComponent();
      });

      const messageListener: WorkflowMessageListener = (event) => {
        events.push(event);
      };

      await TestWorkflow(undefined, {
        messageListener,
      });

      expect(events).toHaveLength(10); // Four object events

      // All four publications should be initial
      const objectMessages = events.filter((e) => e.type === "object");
      expect(objectMessages).toHaveLength(4);
      objectMessages.forEach((msg) => {
        expect(msg.isInitial).toBe(true);
      });
    });

    test("applyObjectPatches reconstructs object state from patches", () => {
      const initialState = {};
      const patches: gensx.Operation[] = [
        { op: "add", path: "/name", value: "John" },
        { op: "add", path: "/age", value: 30 },
        {
          op: "add",
          path: "/address",
          value: { city: "New York", zip: "10001" },
        },
      ];

      const result = gensx.applyObjectPatches(patches, initialState);

      expect(result).toEqual({
        name: "John",
        age: 30,
        address: {
          city: "New York",
          zip: "10001",
        },
      });
    });

    test("applyObjectPatches works with replace operations", () => {
      const initialState = {
        name: "John",
        age: 30,
        address: {
          city: "New York",
          zip: "10001",
        },
      };

      const patches: gensx.Operation[] = [
        { op: "replace", path: "/age", value: 31 },
        { op: "replace", path: "/address/city", value: "San Francisco" },
      ];

      const result = gensx.applyObjectPatches(patches, initialState);

      expect(result).toEqual({
        name: "John",
        age: 31,
        address: {
          city: "San Francisco",
          zip: "10001",
        },
      });
    });
  });

  suite("string optimization operations", () => {
    test("string-append operation is used for simple string appends", async () => {
      const events: WorkflowMessage[] = [];

      const TestComponent = gensx.Component("TestComponent", async () => {
        await Promise.resolve();

        // First publication
        gensx.publishObject("streaming-content", {
          content: "Hello",
        });

        // Second publication - append text (common in streaming)
        gensx.publishObject("streaming-content", {
          content: "Hello world",
        });

        return "done";
      });

      const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
        return await TestComponent();
      });

      const messageListener: WorkflowMessageListener = (event) => {
        events.push(event);
      };

      await TestWorkflow(undefined, {
        messageListener,
      });

      expect(events).toHaveLength(8); // Two object events

      // First publication should be initial
      const firstMessage = events[3] as gensx.WorkflowObjectMessage;
      expect(firstMessage.type).toBe("object");
      expect(firstMessage.isInitial).toBe(true);

      // Second publication should use string-append optimization
      const secondMessage = events[4] as gensx.WorkflowObjectMessage;
      expect(secondMessage.type).toBe("object");
      expect(secondMessage.isInitial).toBe(false);
      expect(secondMessage.patches).toEqual([
        { op: "string-append", path: "/content", value: " world" },
      ]);
    });

    test("applyObjectPatches correctly handles string-append operations", () => {
      const initialState = { content: "Hello" };
      const patches: gensx.Operation[] = [
        { op: "string-append", path: "/content", value: " world" },
      ];

      const result = gensx.applyObjectPatches(patches, initialState);

      expect(result).toEqual({ content: "Hello world" });
    });

    test("falls back to standard replace for complex string changes", async () => {
      const events: WorkflowMessage[] = [];

      const TestComponent = gensx.Component("TestComponent", async () => {
        await Promise.resolve();

        // First publication
        gensx.publishObject("content", {
          text: "Short text",
        });

        // Second publication - completely different short text
        gensx.publishObject("content", {
          text: "Different",
        });

        return "done";
      });

      const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
        return await TestComponent();
      });

      const messageListener: WorkflowMessageListener = (event) => {
        events.push(event);
      };

      await TestWorkflow(undefined, {
        messageListener,
      });

      expect(events).toHaveLength(8); // Two object events

      // Second publication should use standard replace (not append or diff)
      const secondMessage = events[4] as gensx.WorkflowObjectMessage;
      expect(secondMessage.type).toBe("object");
      expect(secondMessage.patches[0].op).toBe("replace");
      expect((secondMessage.patches[0] as any).value).toBe("Different");
    });
  });
});

suite("publishObject root-level values", () => {
  test("emits a root-level replace patch for primitive values", () => {
    // No need for events or label in this test

    // First publish: number
    gensx.publishObject("primitive-root", 42);
    // Second publish: different number
    gensx.publishObject("primitive-root", 43);
    // Third publish: boolean
    gensx.publishObject("primitive-root", true);
    // Fourth publish: null
    gensx.publishObject("primitive-root", null);

    // Simulate message listener
    // (We only care about the patches, so we reconstruct them manually)
    const patches1: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: 42 },
    ];
    const patches2: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: 43 },
    ];
    const patches3: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: true },
    ];
    const patches4: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: null },
    ];

    // Apply patches in sequence
    let state: gensx.JsonValue | undefined = undefined;
    state = gensx.applyObjectPatches(patches1, state);
    expect(state).toBe(42);
    state = gensx.applyObjectPatches(patches2, state);
    expect(state).toBe(43);
    state = gensx.applyObjectPatches(patches3, state);
    expect(state).toBe(true);
    state = gensx.applyObjectPatches(patches4, state);
    expect(state).toBe(null);
  });

  test("emits a root-level replace patch for arrays", () => {
    const arr1 = [1, 2, 3];
    const arr2 = [1, 2, 3, 4];
    const arr3 = ["a", "b"];

    gensx.publishObject("array-root", arr1);
    gensx.publishObject("array-root", arr2);
    gensx.publishObject("array-root", arr3);

    const patches1: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: arr1 },
    ];
    const patches2: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: arr2 },
    ];
    const patches3: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: arr3 },
    ];

    let state: gensx.JsonValue | undefined = undefined;
    state = gensx.applyObjectPatches(patches1, state);
    expect(state).toEqual(arr1);
    state = gensx.applyObjectPatches(patches2, state);
    expect(state).toEqual(arr2);
    state = gensx.applyObjectPatches(patches3, state);
    expect(state).toEqual(arr3);
  });

  test("emits a root-level string-append patch for string appends at the root", () => {
    const s1 = "foo";
    const s2 = "foobar";
    const s3 = "foobar!";

    // Simulate patch generation
    const patches1: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: s1 },
    ];
    const patches2: gensx.Operation[] = [
      { op: "string-append" as const, path: "", value: "bar" },
    ];
    const patches3: gensx.Operation[] = [
      { op: "string-append" as const, path: "", value: "!" },
    ];

    let state: gensx.JsonValue | undefined = undefined;
    state = gensx.applyObjectPatches(patches1, state);
    expect(state).toBe(s1);
    state = gensx.applyObjectPatches(patches2, state);
    expect(state).toBe(s2);
    state = gensx.applyObjectPatches(patches3, state);
    expect(state).toBe(s3);
  });

  test("falls back to root-level replace for non-append string changes", () => {
    const s1 = "foo";
    const s2 = "bar";

    const patches1: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: s1 },
    ];
    const patches2: gensx.Operation[] = [
      { op: "replace" as const, path: "", value: s2 },
    ];

    let state: gensx.JsonValue | undefined = undefined;
    state = gensx.applyObjectPatches(patches1, state);
    expect(state).toBe(s1);
    state = gensx.applyObjectPatches(patches2, state);
    expect(state).toBe(s2);
  });
});

suite("applyObjectPatches edge cases", () => {
  test("does nothing and warns if string-append targets non-existent path", () => {
    const initialState: Record<string, string> = { foo: "bar" };
    const patches: gensx.Operation[] = [
      { op: "string-append", path: "/doesnotexist", value: "baz" },
    ];
    const result = gensx.applyObjectPatches(patches, initialState);
    expect(result).toEqual(initialState);
  });

  test("does nothing and warns if string-append targets non-object parent", () => {
    const initialState = "not-an-object";
    const patches: gensx.Operation[] = [
      { op: "string-append", path: "/foo", value: "baz" },
    ];
    const result = gensx.applyObjectPatches(patches, initialState);
    expect(result).toEqual(initialState);
  });
});

suite("getValueByJsonPath", () => {
  test("returns root object for empty path (object)", () => {
    const obj = { a: 1 };
    expect(getValueByJsonPath(obj, "")).toBe(obj);
  });
  test("returns root value for empty path (string)", () => {
    const str = "hello";
    expect(getValueByJsonPath(str, "")).toBe(str);
  });
  test("returns root value for empty path (number)", () => {
    const num = 42;
    expect(getValueByJsonPath(num, "")).toBe(num);
  });
  test("returns root value for empty path (array)", () => {
    const arr = [1, 2, 3];
    expect(getValueByJsonPath(arr, "")).toBe(arr);
  });
});
