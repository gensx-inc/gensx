/* eslint-disable @typescript-eslint/require-await */
import { beforeEach, expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { clearAllStates } from "../src/state.js";
import { ProgressEvent, ProgressListener } from "../src/workflow-context.js";

interface TestComponentState {
  progress: number;
  status: "starting" | "processing" | "complete";
  data?: string;
}

suite("stateful components", () => {
  beforeEach(() => {
    clearAllStates();
  });

  test("can create a stateful component with non-broadcasting state", async () => {
    const events: ProgressEvent[] = [];

    const TestStatefulComponent = gensx.StatefulComponent(
      "TestStatefulComponent",
      {
        progress: 0,
        status: "starting" as const,
        data: undefined,
      } as TestComponentState,
      (
        props: { input: string },
        state: gensx.StateManager<TestComponentState>,
      ) => {
        const outputPromise = (async () => {
          // Add a small delay so initial state can be checked
          await new Promise((resolve) => setTimeout(resolve, 1));

          state.update((s) => ({ ...s, status: "processing", progress: 50 }));

          // Simulate some work
          await new Promise((resolve) => setTimeout(resolve, 10));

          state.update((s) => ({
            ...s,
            status: "complete",
            progress: 100,
            data: `Processed: ${props.input}`,
          }));

          return `Result: ${props.input}`;
        })();

        return outputPromise;
      },
    );

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const { output, state } = TestStatefulComponent({ input: "test data" });

      // State should be available immediately (initial state)
      expect(state.get()).toEqual({
        progress: 0,
        status: "starting",
      });

      const result = await output;
      expect(result).toBe("Result: test data");

      // State should be updated after completion
      const finalState = state.get();
      expect(finalState.status).toBe("complete");
      expect(finalState.progress).toBe(100);
      expect(finalState.data).toBe("Processed: test data");

      return result;
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    const result = await TestWorkflow(undefined, { progressListener });
    expect(result).toBe("Result: test data");

    // Component state should NOT emit progress events (only workflow state does)
    const stateEvents = events.filter((e) => e.type === "state-update");
    expect(stateEvents).toHaveLength(0); // No state events should be emitted
  });

  test("stateful component state is separate from workflow state", async () => {
    const events: ProgressEvent[] = [];

    const TestStatefulComponent = gensx.StatefulComponent(
      "TestStatefulComponent",
      {
        progress: 0,
        status: "starting" as const,
        data: undefined,
      } as TestComponentState,
      (
        props: { input: string },
        state: gensx.StateManager<TestComponentState>,
      ) => {
        const outputPromise = (async () => {
          state.update((s) => ({ ...s, progress: 100, status: "complete" }));
          return props.input;
        })();

        return outputPromise;
      },
    );

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      // Create workflow state with same structure
      const workflowState = gensx.state<TestComponentState>("workflow", {
        progress: 0,
        status: "starting",
      });

      // Update workflow state
      workflowState.update((s) => ({ ...s, status: "processing" }));

      // Run stateful component
      const { output, state: componentState } = TestStatefulComponent({
        input: "test",
      });
      await output;

      // Component and workflow states should be independent
      expect(workflowState.get().status).toBe("processing");
      expect(componentState.get().status).toBe("complete");

      return "done";
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, { progressListener });

    // Only workflow state should emit events
    const stateEvents = events.filter((e) => e.type === "state-update");
    expect(stateEvents.length).toBeGreaterThan(0);
    expect(stateEvents.every((e) => e.stateName === "workflow")).toBe(true);
  });

  test("multiple instances of same stateful component have separate state", async () => {
    const TestStatefulComponent = gensx.StatefulComponent(
      "TestStatefulComponent",
      {
        progress: 0,
        status: "starting" as const,
        data: undefined,
      } as TestComponentState,
      (
        props: { value: number },
        state: gensx.StateManager<TestComponentState>,
      ) => {
        // Initialize with the prop value
        state.set({
          progress: props.value,
          status: "starting",
        });

        const outputPromise = (async () => {
          state.update((s) => ({
            ...s,
            progress: s.progress * 2,
            status: "complete",
          }));
          return state.get().progress;
        })();

        return outputPromise;
      },
    );

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const instance1 = TestStatefulComponent({ value: 10 });
      const instance2 = TestStatefulComponent({ value: 20 });

      const [result1, result2] = await Promise.all([
        instance1.output,
        instance2.output,
      ]);

      // Each instance should have independent state
      expect(instance1.state.get().progress).toBe(20); // 10 * 2
      expect(instance2.state.get().progress).toBe(40); // 20 * 2

      return { result1, result2 };
    });

    const result = await TestWorkflow();
    expect(result.result1).toBe(20);
    expect(result.result2).toBe(40);
  });

  test("stateful component supports streaming outputs alongside state updates", async () => {
    const events: ProgressEvent[] = [];

    const StreamingStatefulComponent = gensx.StatefulComponent(
      "StreamingStatefulComponent",
      {
        progress: 0,
        status: "starting" as const,
        chunks: 0,
      },
      (
        props: { count: number },
        state: gensx.StateManager<{
          progress: number;
          status: "starting" | "streaming" | "complete";
          chunks: number;
        }>,
      ) => {
        // Return an async generator for streaming
        const streamingOutput = async function* () {
          state.update((s) => ({ ...s, status: "streaming" }));

          for (let i = 0; i < props.count; i++) {
            const chunk = `chunk-${i}`;

            // Update state with progress
            state.update((s) => ({
              ...s,
              progress: ((i + 1) / props.count) * 100,
              chunks: i + 1,
            }));

            yield chunk;

            // Small delay to simulate work
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          state.update((s) => ({ ...s, status: "complete" }));
        };

        return streamingOutput();
      },
    );

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const { output, state } = StreamingStatefulComponent({ count: 3 });

      // State should be available immediately
      expect(state.get().status).toBe("starting");
      expect(state.get().progress).toBe(0);

      // Collect streamed chunks
      const chunks: string[] = [];
      const stream = await output; // Get the async generator
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Verify streaming worked
      expect(chunks).toEqual(["chunk-0", "chunk-1", "chunk-2"]);

      // Verify final state
      const finalState = state.get();
      expect(finalState.status).toBe("complete");
      expect(finalState.progress).toBe(100);
      expect(finalState.chunks).toBe(3);

      return chunks;
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    const result = await TestWorkflow(undefined, { progressListener });
    expect(result).toEqual(["chunk-0", "chunk-1", "chunk-2"]);

    // Verify component events were emitted
    const componentEvents = events.filter(
      (e) => e.type === "component-start" || e.type === "component-end",
    );
    expect(componentEvents.length).toBeGreaterThan(0);
  });
});
