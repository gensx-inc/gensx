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
      doing: "Custom progress",
      status: "in-progress",
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
