/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { ProgressEvent, ProgressListener } from "../src/workflow-context.js";

suite("progress tracking", () => {
  test("can emit progress events from components", async () => {
    const events: ProgressEvent[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.emitProgress("Test progress message");
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      progressListener,
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
      type: "progress",
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

  test("can emit progress events with custom properties", async () => {
    const events: ProgressEvent[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.emitProgress({
        doing: "Custom progress",
        status: "in-progress",
      });
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      progressListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "progress",
      data: {
        doing: "Custom progress",
        status: "in-progress",
      },
    });
  });

  test("can emit progress events with nested objects", async () => {
    const events: ProgressEvent[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.emitProgress({
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

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      progressListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "progress",
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

  test("can emit progress events with various JSON types", async () => {
    const events: ProgressEvent[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();

      // Test string
      gensx.emitProgress("Simple string message");

      // Test number
      gensx.emitProgress(42);

      // Test boolean
      gensx.emitProgress(true);

      // Test null
      gensx.emitProgress(null);

      // Test array
      gensx.emitProgress([1, "two", { three: 3 }, [4, 5]]);

      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      progressListener,
    });

    expect(events).toHaveLength(11); // start, component-start, component-start, 5 progress events, component-end, component-end, end

    // Check each progress event
    expect(events[3]).toEqual({
      type: "progress",
      data: "Simple string message",
    });

    expect(events[4]).toEqual({
      type: "progress",
      data: 42,
    });

    expect(events[5]).toEqual({
      type: "progress",
      data: true,
    });

    expect(events[6]).toEqual({
      type: "progress",
      data: null,
    });

    expect(events[7]).toEqual({
      type: "progress",
      data: [1, "two", { three: 3 }, [4, 5]],
    });
  });

  test("can emit progress events with deeply nested structures", async () => {
    const events: ProgressEvent[] = [];

    const TestComponent = gensx.Component("TestComponent", async () => {
      await Promise.resolve();
      gensx.emitProgress({
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

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      progressListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "progress",
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
    const events: ProgressEvent[] = [];

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
      gensx.emitProgress(complexData);
      return "done";
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await TestComponent();
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);

      // Simulate what happens in the Redis backend:
      // 1. Serialize the data to a JSON string
      // 2. Deserialize it back to verify integrity
      if (event.type === "progress") {
        const serialized = JSON.stringify(event.data);
        const deserialized = JSON.parse(serialized);

        // Verify that serialization/deserialization preserves the data
        expect(deserialized).toEqual(complexData);
      }
    };

    await TestWorkflow(undefined, {
      progressListener,
    });

    expect(events).toHaveLength(7);
    expect(events[3]).toEqual({
      type: "progress",
      data: complexData,
    });
  });

  test("emits error events when component fails", async () => {
    const events: ProgressEvent[] = [];

    const ErrorComponent = gensx.Component("ErrorComponent", async () => {
      await Promise.resolve();
      throw new Error("Test error");
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      return await ErrorComponent();
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    try {
      await TestWorkflow(undefined, {
        progressListener,
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

  test("emits progress events for streaming components", async () => {
    const events: ProgressEvent[] = [];

    const StreamingComponent = gensx.Component(
      "StreamingComponent",
      async function* () {
        await Promise.resolve();
        gensx.emitProgress("Starting stream");
        yield "chunk1";
        await Promise.resolve();
        gensx.emitProgress("Middle of stream");
        yield "chunk2";
        await Promise.resolve();
        gensx.emitProgress("End of stream");
      },
    );

    const TestWorkflow = gensx.Workflow("TestWorkflow", () => {
      return StreamingComponent();
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    const stream = await TestWorkflow(undefined, {
      progressListener,
    });

    let content = "";
    for await (const chunk of stream) {
      content += chunk;
    }

    expect(content).toBe("chunk1chunk2");
    expect(events).toHaveLength(9);
    expect(events[3]).toEqual({
      type: "progress",
      data: "Starting stream",
    });
    expect(events[4]).toEqual({
      type: "progress",
      data: "Middle of stream",
    });
    expect(events[5]).toEqual({
      type: "progress",
      data: "End of stream",
    });
  });

  test("supports workflow execution ID in progress events", async () => {
    const events: ProgressEvent[] = [];

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      await Promise.resolve();
      return "done";
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, {
      progressListener,
      workflowExecutionId: "test-execution-123",
    });

    expect(events[0]).toEqual({
      type: "start",
      workflowName: "TestWorkflow",
      workflowExecutionId: "test-execution-123",
    });
  });
});
