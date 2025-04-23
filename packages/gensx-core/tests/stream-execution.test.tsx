import { setTimeout } from "timers/promises";

import { beforeEach, expect, suite, test, vi } from "vitest";

import * as gensx from "../src/index.js";

let pendingUpdatesCalled = false;
vi.mock("../src/checkpoint.ts", () => {
  const mockCheckpointManager = {
    waitForPendingUpdates: async () => {
      console.log("waitForPendingUpdates called");
      await Promise.resolve();
      pendingUpdatesCalled = true;
      return Promise.resolve();
    },
    setPrintUrl: (_enabled: boolean) => {
      return;
    },
    setWorkflowName: (_name: string) => {
      return;
    },
    addNode: () => "test-id",
    addMetadata: (_id: string, _metadata: Record<string, unknown>) => {
      return;
    },
    completeNode: () => Promise.resolve(),
    updateNode: () => Promise.resolve(),
    root: { id: "test-id" },
    write: () => Promise.resolve(),
  };

  return {
    CheckpointManager: vi.fn().mockImplementation(() => mockCheckpointManager),
  };
});

suite("returning streamable results from a workflow", () => {
  beforeEach(() => {
    pendingUpdatesCalled = false;
  });

  test("waits for pending checkpoints after stream completion", async () => {
    const StreamComponent = gensx.StreamComponent<{ foo: string }>(
      "test",
      (props) => {
        const generator = async function* () {
          await Promise.resolve();
          yield props.foo;
          yield " ";
          yield "world";
        };
        return generator();
      },
    );

    const workflow = gensx.Workflow("test", StreamComponent);
    const iterator = await workflow.run({
      stream: true,
      foo: "hello",
    });

    // Verify waitForPendingUpdates hasn't been called yet
    expect(pendingUpdatesCalled).toBe(false);

    // Consume the stream
    let result = "";
    for await (const chunk of iterator) {
      result += chunk;
    }

    // Verify the stream worked correctly
    expect(result).toBe("hello world");

    // Give a small delay to allow for async operations to complete
    await setTimeout(10);

    // Verify waitForPendingUpdates was called after stream completion
    expect(pendingUpdatesCalled).toBe(true);
  });

  test("waits for pending checkpoints after stream error", async () => {
    const StreamComponent = gensx.StreamComponent<{ shouldError: boolean }>(
      "test",
      (props) => {
        const generator = async function* () {
          await Promise.resolve();
          yield "start";
          if (props.shouldError) {
            throw new Error("Test error");
          }
          yield "end";
        };
        return generator();
      },
    );

    const workflow = gensx.Workflow("test", StreamComponent);
    const iterator = await workflow.run({
      stream: true,
      shouldError: true,
    });

    // Verify waitForPendingUpdates hasn't been called yet
    expect(pendingUpdatesCalled).toBe(false);

    // Try to consume the stream (should error)
    let result = "";
    try {
      for await (const chunk of iterator) {
        result += chunk;
      }
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toBe("Test error");
    }

    // Verify we got the first chunk before the error
    expect(result).toBe("start");

    // Give a small delay to allow for async operations to complete
    await setTimeout(10);

    // Verify waitForPendingUpdates was called after stream error
    expect(pendingUpdatesCalled).toBe(true);
  });

  test("handles both sync and async iterators", async () => {
    // Test with a synchronous iterator
    const SyncStreamComponent = gensx.StreamComponent<{ foo: string }>(
      "test",
      (props) => {
        function* generator() {
          yield props.foo;
          yield " ";
          yield "world";
        }
        return generator();
      },
    );

    const workflow = gensx.Workflow("test", SyncStreamComponent);
    const iterator = await workflow.run({
      stream: true,
      foo: "hello",
    });

    // Verify waitForPendingUpdates hasn't been called yet
    expect(pendingUpdatesCalled).toBe(false);

    // Consume the stream
    let result = "";
    for await (const chunk of iterator) {
      result += chunk;
    }

    // Verify the stream worked correctly
    expect(result).toBe("hello world");

    // Give a small delay to allow for async operations to complete
    await setTimeout(10);

    // Verify waitForPendingUpdates was called after stream completion
    expect(pendingUpdatesCalled).toBe(true);
  });
});
