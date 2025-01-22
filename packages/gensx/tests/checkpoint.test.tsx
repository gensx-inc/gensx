import { setTimeout } from "timers/promises";

import type { ExecutionNode } from "@/checkpoint.js";
import type { ExecutableValue } from "@/types.js";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { CheckpointManager } from "@/checkpoint.js";
import { ExecutionContext, withContext } from "@/context.js";
import { gsx } from "@/index.js";
import { createWorkflowContext } from "@/workflow-context.js";

// Add types for fetch API
type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

// Helper function to generate test IDs
function generateTestId(): string {
  return `test-${Math.random().toString(36).substring(7)}`;
}

/**
 * Helper to execute a workflow with checkpoint tracking
 * Returns both the execution result and recorded checkpoints for verification
 */

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
async function executeWithCheckpoints<T>(element: ExecutableValue): Promise<{
  result: T;
  checkpoints: ExecutionNode[];
  checkpointManager: CheckpointManager;
}> {
  const checkpoints: ExecutionNode[] = [];

  // Set up fetch mock to capture checkpoints
  global.fetch = vi
    .fn()
    // eslint-disable-next-line @typescript-eslint/require-await
    .mockImplementation(async (_input: FetchInput, options?: FetchInit) => {
      if (!options?.body) throw new Error("No body provided");
      const checkpoint = JSON.parse(options.body as string) as ExecutionNode;
      checkpoints.push(checkpoint);
      return new Response(null, { status: 200 });
    });

  // Create and configure workflow context
  const checkpointManager = new CheckpointManager();
  const workflowContext = createWorkflowContext();
  workflowContext.checkpointManager = checkpointManager;
  const executionContext = new ExecutionContext({});
  const contextWithWorkflow = executionContext.withContext({
    [Symbol.for("gensx.workflow")]: workflowContext,
  });

  // Execute with context
  const result = await withContext(contextWithWorkflow, () =>
    gsx.execute<T>(element),
  );

  // Wait for any pending checkpoints
  await checkpointManager.waitForPendingUpdates();

  return { result, checkpoints, checkpointManager };
}

suite("checkpoint", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.GENSX_CHECKPOINTS;

  beforeEach(() => {
    process.env.GENSX_CHECKPOINTS = "true";
    // Mock fetch for all tests
    global.fetch = vi
      .fn()
      .mockImplementation((_input: FetchInput, _options?: FetchInit) => {
        return new Response(null, { status: 200 });
      });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.GENSX_CHECKPOINTS = originalEnv;
    vi.restoreAllMocks();
  });

  test("basic component test", async () => {
    // Define a simple component that returns a string
    const SimpleComponent = gsx.Component<{ message: string }, string>(
      "SimpleComponent",
      async ({ message }) => {
        await setTimeout(0); // Add small delay like other tests
        return `hello ${message}`;
      },
    );

    // Execute workflow and get results
    const { result, checkpoints } = await executeWithCheckpoints<string>(
      <SimpleComponent message="world" />,
    );

    // Verify execution result
    expect(result).toBe("hello world");

    // Verify checkpoint calls were made
    expect(global.fetch).toHaveBeenCalled();

    // Get final checkpoint state
    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    // Verify checkpoint structure
    expect(finalCheckpoint).toMatchObject({
      componentName: "SimpleComponent",
      props: { message: "world" },
      output: "hello world",
    });

    // Verify timing fields
    expect(finalCheckpoint.startTime).toBeDefined();
    expect(finalCheckpoint.endTime).toBeDefined();
    expect(finalCheckpoint.startTime).toBeLessThan(finalCheckpoint.endTime!);
  });

  test("no checkpoints when disabled", async () => {
    // Disable checkpoints
    process.env.GENSX_CHECKPOINTS = undefined;

    // Define a simple component that returns a string
    const SimpleComponent = gsx.Component<{ message: string }, string>(
      "SimpleComponent",
      async ({ message }) => {
        await setTimeout(0);
        return `hello ${message}`;
      },
    );

    // Execute workflow and get results
    const { result, checkpoints } = await executeWithCheckpoints<string>(
      <SimpleComponent message="world" />,
    );

    // Verify execution still works
    expect(result).toBe("hello world");

    // Verify no checkpoint calls were made
    expect(global.fetch).not.toHaveBeenCalled();
    expect(checkpoints).toHaveLength(0);
  });

  test("handles parallel execution", async () => {
    // Define a simple component that we'll use many times
    const SimpleComponent = gsx.Component<{ id: number }, string>(
      "SimpleComponent",
      async ({ id }) => {
        await setTimeout(0); // Small delay to ensure parallel execution
        return `component ${id}`;
      },
    );

    // Create a component that returns an array of parallel executions
    const ParallelComponent = gsx.Component<{}, string[]>(
      "ParallelComponent",
      async () => {
        return Promise.all(
          Array.from({ length: 100 }).map((_, i) =>
            gsx.execute<string>(<SimpleComponent id={i} />),
          ),
        );
      },
    );

    // Execute workflow and get results
    const { result, checkpoints } = await executeWithCheckpoints<string[]>(
      <ParallelComponent />,
    );

    // Verify execution result
    expect(result).toHaveLength(100);
    expect(result[0]).toBe("component 0");
    expect(result[99]).toBe("component 99");

    // Verify checkpoint behavior
    const fetchCalls = (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.length;

    // We expect:
    // - Some minimum number of calls to capture the state (could be heavily batched)
    // - Less than the theoretical maximum (303 = parent(2) + children(200) + execute calls(101))
    // - Evidence of queueing (significantly less than theoretical maximum)
    expect(fetchCalls).toBeGreaterThan(0); // At least some calls must happen
    expect(fetchCalls).toBeLessThan(303); // Less than theoretical maximum
    expect(fetchCalls).toBeLessThan(250); // Evidence of significant queueing

    // Verify we have all nodes
    const finalCheckpoint = checkpoints[checkpoints.length - 1];
    expect(finalCheckpoint.componentName).toBe("ParallelComponent");

    function countNodes(node: ExecutionNode): number {
      return (
        1 + node.children.reduce((sum, child) => sum + countNodes(child), 0)
      );
    }
    expect(countNodes(finalCheckpoint)).toBe(101);
    expect(finalCheckpoint.children.length).toBe(100);
  });

  test("handles sequential execute calls within component", async () => {
    // Define a simple component that we'll use multiple times
    const SimpleComponent = gsx.Component<{ id: number }, string>(
      "SimpleComponent",
      async ({ id }) => {
        await setTimeout(0);
        return `component ${id}`;
      },
    );

    // Create a component that makes three sequential execute calls
    const ParentComponent = gsx.Component<{}, string>(
      "ParentComponent",
      async () => {
        const first = await gsx.execute<string>(<SimpleComponent id={1} />);
        const second = await gsx.execute<string>(<SimpleComponent id={2} />);
        const third = await gsx.execute<string>(<SimpleComponent id={3} />);
        return `${first}, ${second}, ${third}`;
      },
    );

    // Execute workflow and get results
    const { result, checkpoints } = await executeWithCheckpoints<string>(
      <ParentComponent />,
    );

    // Verify execution result
    expect(result).toBe("component 1, component 2, component 3");

    // Get final checkpoint state
    const finalCheckpoint = checkpoints[checkpoints.length - 1];
    expect(finalCheckpoint.componentName).toBe("ParentComponent");

    // For now, verify we have the right number of total nodes (1 parent + 3 children)
    function countNodes(node: ExecutionNode): number {
      return (
        1 + node.children.reduce((sum, child) => sum + countNodes(child), 0)
      );
    }
    expect(countNodes(finalCheckpoint)).toBe(4);
    expect(finalCheckpoint.children.length).toBe(3);
  });

  test("handles component children with object return", async () => {
    // Define child components
    const ComponentA = gsx.Component<{ value: string }, string>(
      "ComponentA",
      async ({ value }) => {
        await setTimeout(0);
        return `a:${value}`;
      },
    );

    const ComponentB = gsx.Component<{ value: string }, string>(
      "ComponentB",
      async ({ value }) => {
        await setTimeout(0);
        return `b:${value}`;
      },
    );

    // Create parent component that returns an object with multiple children
    const ParentComponent = gsx.Component<{}, { a: string; b: string }>(
      "ParentComponent",
      () => {
        return {
          a: <ComponentA value="first" />,
          b: <ComponentB value="second" />,
        };
      },
    );

    // Execute workflow and get results
    const { result, checkpoints } = await executeWithCheckpoints<{
      a: string;
      b: string;
    }>(<ParentComponent />);

    // Verify execution result
    expect(result).toEqual({
      a: "a:first",
      b: "b:second",
    });

    // Get final checkpoint state
    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    // Verify checkpoint structure
    expect(finalCheckpoint).toMatchObject({
      componentName: "ParentComponent",
      children: [
        {
          componentName: "ComponentA",
          children: [],
          output: "a:first",
          props: { value: "first" },
        },
        {
          componentName: "ComponentB",
          output: "b:second",
          props: { value: "second" },
          children: [],
        },
      ],
      output: { a: "a:first", b: "b:second" },
    });
  });

  test("handles nested component hierarchy", async () => {
    // Define components that will be nested
    const ComponentC = gsx.Component<{ value: string }, string>(
      "ComponentC",
      async ({ value }) => {
        await setTimeout(0);
        return `c:${value}`;
      },
    );

    const ComponentB = gsx.Component<{ value: string }, string>(
      "ComponentB",
      async ({ value }) => {
        const inner = await gsx.execute<string>(
          <ComponentC value={`${value}-inner`} />,
        );
        return `b:${value}(${inner})`;
      },
    );

    const ComponentA = gsx.Component<{ value: string }, string>(
      "ComponentA",
      async ({ value }) => {
        const middle = await gsx.execute<string>(
          <ComponentB value={`${value}-middle`} />,
        );
        return `a:${value}(${middle})`;
      },
    );

    // Execute workflow and get results
    const { result, checkpoints } = await executeWithCheckpoints<string>(
      <ComponentA value="outer" />,
    );

    // Verify execution result
    expect(result).toBe("a:outer(b:outer-middle(c:outer-middle-inner))");

    // Get final checkpoint state
    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    // Verify checkpoint structure shows proper nesting
    expect(finalCheckpoint).toMatchObject({
      componentName: "ComponentA",
      props: { value: "outer" },
      output: "a:outer(b:outer-middle(c:outer-middle-inner))",
      children: [
        {
          componentName: "ComponentB",
          props: { value: "outer-middle" },
          output: "b:outer-middle(c:outer-middle-inner)",
          children: [
            {
              componentName: "ComponentC",
              props: { value: "outer-middle-inner" },
              output: "c:outer-middle-inner",
            },
          ],
        },
      ],
    });
  });

  test("handles out of order node insertion and tree reconstruction", () => {
    // Test case 1: Simple parent-child relationship
    const cm1 = new CheckpointManager();
    const parentId = generateTestId();
    const child1Id = cm1.addNode({ componentName: "Child1" }, parentId);
    cm1.addNode({ componentName: "Parent", id: parentId });

    // Verify fetch was called with the correct tree structure
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalled();
    const lastCall = fetchMock.mock.lastCall;
    expect(lastCall).toBeDefined();
    const options = lastCall![1] as FetchInit;
    expect(options?.body).toBeDefined();
    const lastCallBody = JSON.parse(options!.body! as string) as ExecutionNode;
    expect(lastCallBody.componentName).toBe("Parent");
    expect(lastCallBody.children[0].componentName).toBe("Child1");

    // Rest of test case 1 assertions
    expect(cm1.root?.componentName).toBe("Parent");
    expect(cm1.root?.children).toHaveLength(1);
    expect(cm1.root?.children[0].componentName).toBe("Child1");
    expect(cm1.root?.children[0].id).toBe(child1Id);

    // Test case 2: Multiple children waiting for same parent
    const cm2 = new CheckpointManager();
    const parent2Id = generateTestId();
    cm2.addNode({ componentName: "Child2A" }, parent2Id);
    cm2.addNode({ componentName: "Child2B" }, parent2Id);
    cm2.addNode({ componentName: "Parent2", id: parent2Id });

    expect(cm2.root?.componentName).toBe("Parent2");
    expect(cm2.root?.children).toHaveLength(2);
    expect(cm2.root?.children.map(c => c.componentName)).toContain("Child2A");
    expect(cm2.root?.children.map(c => c.componentName)).toContain("Child2B");

    // Test case 3: Deep tree with mixed ordering
    const cm3 = new CheckpointManager();
    const root3Id = generateTestId();
    const branch3aId = generateTestId();
    const branch3bId = generateTestId();

    cm3.addNode({ componentName: "Leaf3A" }, branch3aId);
    cm3.addNode({ componentName: "Leaf3B" }, branch3bId);
    cm3.addNode({ componentName: "Root3", id: root3Id });
    cm3.addNode({ componentName: "Branch3A", id: branch3aId }, root3Id);
    cm3.addNode({ componentName: "Branch3B", id: branch3bId }, root3Id);

    const root3 = cm3.root;
    expect(root3?.componentName).toBe("Root3");
    expect(root3?.children).toHaveLength(2);

    const branch3a = root3?.children.find(c => c.componentName === "Branch3A");
    const branch3b = root3?.children.find(c => c.componentName === "Branch3B");

    expect(branch3a?.children[0].componentName).toBe("Leaf3A");
    expect(branch3b?.children[0].componentName).toBe("Leaf3B");

    // Test case 4: Root node arrives after its children
    const cm4 = new CheckpointManager();
    const root4Id = generateTestId();
    const child4Id = cm4.addNode({ componentName: "Child4" }, root4Id);
    cm4.addNode({ componentName: "Grandchild4" }, child4Id);
    cm4.addNode({ componentName: "Root4", id: root4Id });

    expect(cm4.root?.componentName).toBe("Root4");
    expect(cm4.root?.children[0].componentName).toBe("Child4");
    expect(cm4.root?.children[0].children[0].componentName).toBe("Grandchild4");

    // Test case 5: Complex reordering with multiple levels
    const cm5 = new CheckpointManager();
    const root5Id = generateTestId();
    const branch5aId = generateTestId();
    const branch5bId = generateTestId();

    cm5.addNode({ componentName: "Leaf5A" }, branch5aId);
    cm5.addNode({ componentName: "Leaf5B" }, branch5bId);
    cm5.addNode({ componentName: "Leaf5C" }, branch5aId);

    cm5.addNode({ componentName: "Branch5B", id: branch5bId }, root5Id);
    cm5.addNode({ componentName: "Root5", id: root5Id });
    cm5.addNode({ componentName: "Branch5A", id: branch5aId }, root5Id);

    const root5 = cm5.root;
    expect(root5?.componentName).toBe("Root5");
    expect(root5?.children).toHaveLength(2);

    const branch5a = root5?.children.find(c => c.componentName === "Branch5A");
    const branch5b = root5?.children.find(c => c.componentName === "Branch5B");

    // Verify all nodes are connected properly
    expect(branch5a?.children.map(c => c.componentName)).toContain("Leaf5A");
    expect(branch5a?.children.map(c => c.componentName)).toContain("Leaf5C");
    expect(branch5b?.children.map(c => c.componentName)).toContain("Leaf5B");

    // Verify tree integrity - every node should have correct parent reference
    function verifyNodeParentRefs(node: ExecutionNode) {
      for (const child of node.children) {
        expect(child.parentId).toBe(node.id);
        verifyNodeParentRefs(child);
      }
    }
    verifyNodeParentRefs(root5!);
  });

  test("handles streaming components", async () => {
    // Define a streaming component that yields tokens with delays
    const StreamingComponent = gsx.StreamComponent<{ tokens: string[] }>(
      "StreamingComponent",
      ({ tokens }) => {
        const stream = async function* () {
          for (const token of tokens) {
            await setTimeout(0); // Small delay between tokens
            yield token;
          }
        };
        return stream();
      },
    );

    // Test non-streaming mode first
    const { result: nonStreamingResult, checkpoints: nonStreamingCheckpoints } =
      await executeWithCheckpoints<string>(
        <StreamingComponent tokens={["Hello", " ", "World"]} stream={false} />,
      );

    // Verify non-streaming execution
    expect(nonStreamingResult).toBe("Hello World");
    const nonStreamingFinal =
      nonStreamingCheckpoints[nonStreamingCheckpoints.length - 1];
    expect(nonStreamingFinal).toMatchObject({
      componentName: "StreamingComponent",
      props: { tokens: ["Hello", " ", "World"] },
      output: "Hello World",
    });

    // Test streaming mode
    const {
      result: streamingResult,
      checkpoints: streamingCheckpoints,
      checkpointManager,
    } = await executeWithCheckpoints<AsyncGenerator<string>>(
      <StreamingComponent tokens={["Hello", " ", "World"]} stream={true} />,
    );

    // Collect streaming results
    let streamedContent = "";
    for await (const token of streamingResult) {
      streamedContent += token;
    }

    // Wait for final checkpoint to be written
    await checkpointManager.waitForPendingUpdates();

    // Verify streaming execution
    expect(streamedContent).toBe("Hello World");
    const streamingFinal =
      streamingCheckpoints[streamingCheckpoints.length - 1];
    expect(streamingFinal).toMatchObject({
      componentName: "StreamingComponent",
      props: { tokens: ["Hello", " ", "World"] },
      output: "Hello World",
      metadata: { streamCompleted: true },
    });
  });

  test("handles errors in streaming components", async () => {
    const ErrorStreamingComponent = gsx.StreamComponent<{
      shouldError: boolean;
    }>("ErrorStreamingComponent", ({ shouldError }) => {
      const stream = async function* () {
        yield "start";
        await setTimeout(0); // Add delay to ensure async behavior
        if (shouldError) {
          throw new Error("Stream error");
        }
        yield "end";
      };
      return stream();
    });

    // Execute with error
    const {
      result: errorResult,
      checkpoints: errorCheckpoints,
      checkpointManager,
    } = await executeWithCheckpoints<AsyncGenerator<string>>(
      <ErrorStreamingComponent shouldError={true} stream={true} />,
    );

    // Collect results until error
    let errorContent = "";
    try {
      for await (const token of errorResult) {
        errorContent += token;
      }
    } catch (_error) {
      // Expected error, ignore
    }

    // Wait for final checkpoint to be written
    await checkpointManager.waitForPendingUpdates();

    // Verify error state
    expect(errorContent).toBe("start");
    const errorFinal = errorCheckpoints[errorCheckpoints.length - 1];
    expect(errorFinal).toMatchObject({
      componentName: "ErrorStreamingComponent",
      output: "start",
      metadata: {
        error: "Stream error",
        streamCompleted: false,
      },
    });
  });
});
