/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  WorkflowMessage,
  WorkflowMessageListener,
} from "src/workflow-state.js";
import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";

suite("workflow state", () => {
  test("can emit workflow messages from components", async () => {
    const events: WorkflowMessage[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.sendMessage("Test progress message");
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
      type: "message",
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
      gensx.sendMessage({
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
      type: "message",
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
      gensx.sendMessage({
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
      type: "message",
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
      gensx.sendMessage("Simple string message");

      // Test number
      gensx.sendMessage(42);

      // Test boolean
      gensx.sendMessage(true);

      // Test null
      gensx.sendMessage(null);

      // Test array
      gensx.sendMessage([1, "two", { three: 3 }, [4, 5]]);

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
      type: "message",
      data: "Simple string message",
    });

    expect(events[4]).toEqual({
      type: "message",
      data: 42,
    });

    expect(events[5]).toEqual({
      type: "message",
      data: true,
    });

    expect(events[6]).toEqual({
      type: "message",
      data: null,
    });

    expect(events[7]).toEqual({
      type: "message",
      data: [1, "two", { three: 3 }, [4, 5]],
    });
  });

  test("can emit workflow messages with deeply nested structures", async () => {
    const events: WorkflowMessage[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.sendMessage({
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
      type: "message",
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
      gensx.sendMessage(complexData);
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
      if (event.type === "message") {
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
      type: "message",
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
        gensx.sendMessage("Starting stream");
        yield "chunk1";
        await Promise.resolve();
        gensx.sendMessage("Middle of stream");
        yield "chunk2";
        await Promise.resolve();
        gensx.sendMessage("End of stream");
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
      type: "message",
      data: "Starting stream",
    });
    expect(events[4]).toEqual({
      type: "message",
      data: "Middle of stream",
    });
    expect(events[5]).toEqual({
      type: "message",
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

  suite("useEventStream", () => {
    test("can use event stream in components", async () => {
      const events: WorkflowMessage[] = [];

      const testEventStream = gensx.useEventStream("test-event");
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

  suite("useWorkflowState", () => {
    test("can use workflow state in components", async () => {
      const events: WorkflowMessage[] = [];

      const testWorkflowState = gensx.useWorkflowState("test-state");
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
        type: "state",
        label: "test-state",
        data: {
          bag: "of",
          things: ["a", "b", "c"],
        },
      });
    });
  });
});
