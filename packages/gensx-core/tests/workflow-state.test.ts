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
      gensx.publishState("test-state", {
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
      type: "state",
      label: "test-state",
      data: {
        bag: "of",
        things: ["a", "b", "c"],
      },
    });
  });

  suite("useEventStream", () => {
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

  suite("useWorkflowState", () => {
    test("can use workflow state in components", async () => {
      const events: WorkflowMessage[] = [];

      const testWorkflowState = gensx.createWorkflowState("test-state");
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
