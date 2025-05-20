import { readFileSync } from "fs";
import { setTimeout } from "timers/promises";

import type { ExecutionNode } from "../src/checkpoint.js";

import { readFileSync } from "fs";
import { setTimeout } from "timers/promises";

import type { ExecutionNode } from "../src/checkpoint.js";

import { afterEach, beforeEach, describe, expect, suite, test, vi } from "vitest";

import { CheckpointManager } from "../src/checkpoint.js";
import * as gensx from "../src/index.js";
import { readConfig } from "../src/utils/config.js";
// Mock readConfig at the top level
vi.mock("../src/utils/config.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ...actual,
    readConfig: vi.fn(),
  };
});
import {
  executeWithCheckpoints,
  executeWorkflowWithCheckpoints,
  getExecutionFromBody,
  mockFetch,
} from "./utils/executeWithCheckpoints.js";

// Helper function to generate test IDs
export function generateTestId(): string {
  return `test-${Math.random().toString(36).substring(7)}`;
}

suite("checkpoint", () => {
  test("basic component test", async () => {
    // Define a simple component that returns a string
    const SimpleComponent = gensx.Component<{ message: string }, string>(
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
    process.env.GENSX_CHECKPOINTS = "false";

    // Define a simple component that returns a string
    const SimpleComponent = gensx.Component<{ message: string }, string>(
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

    // Restore checkpoints
    process.env.GENSX_CHECKPOINTS = undefined;

    // Verify execution still works
    expect(result).toBe("hello world");

    // Verify no checkpoint calls were made
    expect(global.fetch).not.toHaveBeenCalled();
    expect(checkpoints).toHaveLength(0);
  });

  test("handles parallel execution", async () => {
    // Define a simple component that we'll use many times
    const SimpleComponent = gensx.Component<{ id: number }, string>(
      "SimpleComponent",
      async ({ id }) => {
        await setTimeout(0); // Small delay to ensure parallel execution
        return `component ${id}`;
      },
    );

    // Create a component that returns an array of parallel executions
    const ParallelComponent = gensx.Component<{}, string[]>(
      "ParallelComponent",
      async () => {
        return Promise.all(
          Array.from({ length: 100 }).map((_, i) =>
            gensx.execute<string>(<SimpleComponent id={i} />),
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
    const fetchCalls = vi.mocked(global.fetch).mock.calls.length;

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
    const SimpleComponent = gensx.Component<{ id: number }, string>(
      "SimpleComponent",
      async ({ id }) => {
        await setTimeout(0);
        return `component ${id}`;
      },
    );

    // Create a component that makes three sequential execute calls
    const ParentComponent = gensx.Component<{}, string>(
      "ParentComponent",
      async () => {
        const first = await gensx.execute<string>(<SimpleComponent id={1} />);
        const second = await gensx.execute<string>(<SimpleComponent id={2} />);
        const third = await gensx.execute<string>(<SimpleComponent id={3} />);
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
    const ComponentA = gensx.Component<{ value: string }, string>(
      "ComponentA",
      async ({ value }) => {
        await setTimeout(0);
        return `a:${value}`;
      },
    );

    const ComponentB = gensx.Component<{ value: string }, string>(
      "ComponentB",
      async ({ value }) => {
        await setTimeout(0);
        return `b:${value}`;
      },
    );

    // Create parent component that returns an object with multiple children
    const ParentComponent = gensx.Component<{}, { a: string; b: string }>(
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
    const ComponentC = gensx.Component<{ value: string }, string>(
      "ComponentC",
      async ({ value }) => {
        await setTimeout(0);
        return `c:${value}`;
      },
    );

    const ComponentB = gensx.Component<{ value: string }, string>(
      "ComponentB",
      async ({ value }) => {
        const inner = await gensx.execute<string>(
          <ComponentC value={`${value}-inner`} />,
        );
        return `b:${value}(${inner})`;
      },
    );

    const ComponentA = gensx.Component<{ value: string }, string>(
      "ComponentA",
      async ({ value }) => {
        const middle = await gensx.execute<string>(
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

  test("masks functions in checkpoints", async () => {
    const nativeFunction = readFileSync;
    const customFunction = () => "test";

    type CustomFn = () => string;
    type TimerFn = typeof setTimeout;

    const FunctionComponent = gensx.Component<
      {},
      { fn: CustomFn; native: TimerFn }
    >("FunctionComponent", () => ({
      fn: customFunction,
      native: nativeFunction,
    }));

    const { result, checkpoints } = await executeWithCheckpoints<{
      fn: CustomFn;
      native: TimerFn;
    }>(<FunctionComponent />);

    // Verify the actual result contains the functions
    expect(typeof result.fn).toBe("function");
    expect(typeof result.native).toBe("function");
    expect(result.fn()).toBe("test");

    // Verify the checkpoint masks the functions
    const finalCheckpoint = checkpoints[checkpoints.length - 1];
    expect(finalCheckpoint.output).toEqual({
      fn: "[function]",
      native: "[function]",
    });
  });

  test("uses toJSON method when available for serialization", async () => {
    // Define a class with a custom toJSON method
    class CustomSerializable {
      internalValue: string;
      secretValue: string;

      constructor(value: string, secret: string) {
        this.internalValue = value;
        this.secretValue = secret;
      }

      // This method shouldn't appear in serialized output
      getInternalValue() {
        return this.internalValue;
      }

      // Custom serialization that intentionally excludes secretValue
      toJSON() {
        return {
          serializedValue: this.internalValue,
          transformed: true,
        };
      }
    }

    // Define a component that has a custom serializable object as an input
    const ToJSONComponent = gensx.Component<
      { data: CustomSerializable },
      string
    >("ToJSONComponent", () => {
      return "just a test output";
    });

    // Execute the component with checkpoints
    const { result, checkpoints } = await executeWithCheckpoints<string>(
      <ToJSONComponent
        data={new CustomSerializable("hello world", "secret data")}
      />,
    );

    // The actual result contains the raw object with all properties
    expect(result).toBe("just a test output");

    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    expect(finalCheckpoint.props).toBeDefined();
    expect(finalCheckpoint.props.data).toBeDefined();

    // Type assertion for the props.data
    const propData = finalCheckpoint.props.data as {
      serializedValue: string;
      transformed: boolean;
    };

    expect(propData.serializedValue).toBe("hello world");
    expect(propData.transformed).toBe(true);
  });

  test("handles streaming components", async () => {
    // Define a streaming component that yields tokens with delays
    const StreamingComponent = gensx.StreamComponent<{ tokens: string[] }>(
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
    const ErrorStreamingComponent = gensx.StreamComponent<{
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

  test("adds execution error to metadata when workflow throws", async () => {
    // Define a component that throws an error
    const ErrorComponent = gensx.Component<{ message: string }, string>(
      "ErrorComponent",
      async ({ message }) => {
        await setTimeout(0); // Add small delay like other tests
        throw new Error(message);
      },
    );

    const { checkpoints, error } = await executeWorkflowWithCheckpoints<string>(
      <ErrorComponent message="Test error message" />,
    );

    // Verify error was thrown
    expect(error).toBeDefined();
    expect(error?.message).toBe("Test error message");

    // Verify checkpoint structure includes error in metadata
    expect(Object.values(checkpoints)[0]).toMatchObject({
      componentName: "WorkflowComponentWrapper",
      metadata: {
        error: {
          name: "Error",
          message: "Test error message",
        },
      },
    });
    expect(Object.values(checkpoints)[0].children[0]).toMatchObject({
      componentName: "ErrorComponent",
      metadata: {
        error: {
          name: "Error",
          message: "Test error message",
        },
      },
    });
  });
});

suite("CheckpointManager constructor validation", () => {
  const EXPECTED_ERROR_MESSAGE =
    "Organization not set or is invalid ('undefined' string). A valid organization ID must be set via constructor options, GENSX_ORG environment variable, or in ~/.config/gensx/config when checkpoints are enabled. You can disable checkpoints by setting GENSX_CHECKPOINTS=false or unsetting GENSX_API_KEY.";

  describe("using constructor options", () => {
    let originalApiKeyEnv: string | undefined;
    let originalOrgEnv: string | undefined;

    beforeEach(() => {
      // Isolate tests from environment variables
      originalApiKeyEnv = process.env.GENSX_API_KEY;
      originalOrgEnv = process.env.GENSX_ORG;
      delete process.env.GENSX_API_KEY;
      delete process.env.GENSX_ORG;
      vi.mocked(readConfig).mockReturnValue({}); // Ensure config is empty
    });

    afterEach(() => {
      // Restore environment variables
      process.env.GENSX_API_KEY = originalApiKeyEnv;
      process.env.GENSX_ORG = originalOrgEnv;
      vi.resetAllMocks();
    });

    test("throws error if apiKey is present and org is undefined", () => {
      expect(() => new CheckpointManager({ apiKey: "test-key", org: undefined })).toThrow(EXPECTED_ERROR_MESSAGE);
    });

    test("throws error if apiKey is present and org is an empty string", () => {
      expect(() => new CheckpointManager({ apiKey: "test-key", org: "" })).toThrow(EXPECTED_ERROR_MESSAGE);
    });

    test("throws error if apiKey is present and org is 'undefined' string", () => {
      expect(() => new CheckpointManager({ apiKey: "test-key", org: "undefined" })).toThrow(EXPECTED_ERROR_MESSAGE);
    });

    test("does not throw if apiKey is present and org is valid", () => {
      expect(() => new CheckpointManager({ apiKey: "test-key", org: "test-org" })).not.toThrow();
    });

    test("does not throw if apiKey is not present, even with problematic org", () => {
      expect(() => new CheckpointManager({ apiKey: undefined, org: undefined })).not.toThrow();
      expect(() => new CheckpointManager({ apiKey: undefined, org: "" })).not.toThrow();
      expect(() => new CheckpointManager({ apiKey: undefined, org: "undefined" })).not.toThrow();
    });
  });

  describe("using environment variables", () => {
    beforeEach(() => {
      vi.mocked(readConfig).mockReturnValue({}); // Ensure config is empty
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.resetAllMocks();
    });

    test("(Env 1) throws error if GENSX_API_KEY set, GENSX_ORG is empty", () => {
      vi.stubEnv("GENSX_API_KEY", "env-key");
      vi.stubEnv("GENSX_ORG", "");
      expect(() => new CheckpointManager()).toThrow(EXPECTED_ERROR_MESSAGE);
    });

    test("(Env 2) throws error if GENSX_API_KEY set, GENSX_ORG is 'undefined'", () => {
      vi.stubEnv("GENSX_API_KEY", "env-key");
      vi.stubEnv("GENSX_ORG", "undefined");
      expect(() => new CheckpointManager()).toThrow(EXPECTED_ERROR_MESSAGE);
    });

    test("(Env 3) throws error if GENSX_API_KEY set, GENSX_ORG is not set", () => {
      vi.stubEnv("GENSX_API_KEY", "env-key");
      // GENSX_ORG is unset by default or cleared in afterEach
      expect(() => new CheckpointManager()).toThrow(EXPECTED_ERROR_MESSAGE);
    });

    test("(Env 4) does not throw if GENSX_API_KEY and GENSX_ORG are valid", () => {
      vi.stubEnv("GENSX_API_KEY", "env-key");
      vi.stubEnv("GENSX_ORG", "env-org");
      expect(() => new CheckpointManager()).not.toThrow();
    });

    describe("(Env 5) constructor opts override env vars", () => {
      beforeEach(() => {
        vi.stubEnv("GENSX_API_KEY", "env-key");
        vi.stubEnv("GENSX_ORG", "env-org");
      });

      test("uses constructor values when valid", () => {
        const manager = new CheckpointManager({ apiKey: "ctor-key", org: "ctor-org" });
        expect((manager as any).apiKey).toBe("ctor-key");
        expect((manager as any).org).toBe("ctor-org");
      });

      test("throws if constructor org is invalid, despite valid env org", () => {
        expect(() => new CheckpointManager({ apiKey: "ctor-key", org: "" })).toThrow(EXPECTED_ERROR_MESSAGE);
      });
       test("uses constructor apiKey and env org if constructor org is undefined", () => {
        const manager = new CheckpointManager({ apiKey: "ctor-key", org: undefined });
        expect((manager as any).apiKey).toBe("ctor-key");
        expect((manager as any).org).toBe("env-org"); // Falls back to env org
      });
    });
  });

  describe("using config file", () => {
    let originalApiKeyEnv: string | undefined;
    let originalOrgEnv: string | undefined;

    beforeEach(() => {
      // Clear env vars to ensure config is the primary source
      originalApiKeyEnv = process.env.GENSX_API_KEY;
      originalOrgEnv = process.env.GENSX_ORG;
      delete process.env.GENSX_API_KEY;
      delete process.env.GENSX_ORG;
    });

    afterEach(() => {
      process.env.GENSX_API_KEY = originalApiKeyEnv;
      process.env.GENSX_ORG = originalOrgEnv;
      vi.resetAllMocks(); // Resets readConfig mock
    });

    test("(Config 1) throws error if config api.token set, api.org is empty", () => {
      vi.mocked(readConfig).mockReturnValue({ api: { token: "config-key", org: "" } });
      expect(() => new CheckpointManager()).toThrow(EXPECTED_ERROR_MESSAGE);
    });

    test("(Config 2) throws error if config api.token set, api.org is 'undefined'", () => {
      vi.mocked(readConfig).mockReturnValue({ api: { token: "config-key", org: "undefined" } });
      expect(() => new CheckpointManager()).toThrow(EXPECTED_ERROR_MESSAGE);
    });

    test("(Config 3) throws error if config api.token set, api.org is missing", () => {
      vi.mocked(readConfig).mockReturnValue({ api: { token: "config-key" } });
      expect(() => new CheckpointManager()).toThrow(EXPECTED_ERROR_MESSAGE);
    });

    test("(Config 4) does not throw if config api.token and api.org are valid", () => {
      vi.mocked(readConfig).mockReturnValue({ api: { token: "config-key", org: "config-org" } });
      expect(() => new CheckpointManager()).not.toThrow();
    });

    describe("(Config 5) env vars override config", () => {
      beforeEach(() => {
        // Config has valid values
        vi.mocked(readConfig).mockReturnValue({ api: { token: "config-key", org: "config-org" } });
      });
      
      test("uses env values when env vars are valid", () => {
        vi.stubEnv("GENSX_API_KEY", "env-key");
        vi.stubEnv("GENSX_ORG", "env-org");
        const manager = new CheckpointManager();
        expect((manager as any).apiKey).toBe("env-key");
        expect((manager as any).org).toBe("env-org");
        vi.unstubAllEnvs();
      });

      test("throws if env org is invalid, despite valid config org", () => {
        vi.stubEnv("GENSX_API_KEY", "env-key");
        vi.stubEnv("GENSX_ORG", ""); // Invalid env org
        expect(() => new CheckpointManager()).toThrow(EXPECTED_ERROR_MESSAGE);
        vi.unstubAllEnvs();
      });

      test("uses env apiKey and config org if env org is undefined", () => {
        vi.stubEnv("GENSX_API_KEY", "env-key");
        // GENSX_ORG is not set via stubEnv, should fallback to config
        const manager = new CheckpointManager();
        expect((manager as any).apiKey).toBe("env-key");
        expect((manager as any).org).toBe("config-org");
        vi.unstubAllEnvs();
      });
    });

    describe("(Config 6) constructor opts override config and env vars", () => {
      beforeEach(() => {
        // Config has valid values
        vi.mocked(readConfig).mockReturnValue({ api: { token: "config-key", org: "config-org" } });
        // Env vars also have valid values
        vi.stubEnv("GENSX_API_KEY", "env-key");
        vi.stubEnv("GENSX_ORG", "env-org");
      });
      afterEach(()=> {
        vi.unstubAllEnvs();
      })

      test("uses constructor values when valid", () => {
        const manager = new CheckpointManager({ apiKey: "ctor-key", org: "ctor-org" });
        expect((manager as any).apiKey).toBe("ctor-key");
        expect((manager as any).org).toBe("ctor-org");
      });

      test("throws if constructor org is invalid, despite valid config and env orgs", () => {
        expect(() => new CheckpointManager({ apiKey: "ctor-key", org: "" })).toThrow(EXPECTED_ERROR_MESSAGE);
      });
      
      test("uses constructor apiKey and env org if ctor org is undefined (env overrides config)", () => {
        const manager = new CheckpointManager({ apiKey: "ctor-key", org: undefined });
        expect((manager as any).apiKey).toBe("ctor-key");
        expect((manager as any).org).toBe("env-org"); // Env takes precedence over config
      });
      
      test("uses constructor apiKey and config org if ctor org is undefined and env org is undefined", () => {
        vi.unstubAllEnvs(); // Clear env org, GENSX_API_KEY still "env-key" from outer beforeEach
        delete process.env.GENSX_ORG; // Make sure it's really gone
         vi.stubEnv("GENSX_API_KEY", "env-key"); // Keep API key from env
        
        const manager = new CheckpointManager({ apiKey: "ctor-key", org: undefined });
        expect((manager as any).apiKey).toBe("ctor-key");
        expect((manager as any).org).toBe("config-org"); // Fallback to config
      });
    });
  });
});

suite("tree reconstruction", () => {
  beforeEach(() => {
    mockFetch(() => {
      return new Response(null, { status: 200 });
    });
  });

  test("handles simple parent-child relationship", async () => {
    const cm = new CheckpointManager({
      apiKey: "test-api-key",
      org: "test-org",
    });
    const parentId = generateTestId();
    const childId = cm.addNode({ componentName: "Child1" }, parentId);
    cm.addNode({ componentName: "Parent", id: parentId });

    await cm.waitForPendingUpdates();

    // Verify fetch was called with the correct tree structure
    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).toHaveBeenCalled();
    const lastCall = fetchMock.mock.lastCall;
    expect(lastCall).toBeDefined();
    const options = lastCall![1];
    expect(options?.body).toBeDefined();
    const { node: lastCallBody } = getExecutionFromBody(
      options?.body as string,
    );
    expect(lastCallBody.componentName).toBe("Parent");
    expect(lastCallBody.children[0].componentName).toBe("Child1");

    // Verify tree structure
    expect(cm.root?.componentName).toBe("Parent");
    expect(cm.root?.children).toHaveLength(1);
    expect(cm.root?.children[0].componentName).toBe("Child1");
    expect(cm.root?.children[0].id).toBe(childId);
  });

  test("handles multiple children waiting for same parent", () => {
    const cm = new CheckpointManager();
    const parentId = generateTestId();
    cm.addNode({ componentName: "Child2A" }, parentId);
    cm.addNode({ componentName: "Child2B" }, parentId);
    cm.addNode({ componentName: "Parent2", id: parentId });

    expect(cm.root?.componentName).toBe("Parent2");
    expect(cm.root?.children).toHaveLength(2);
    expect(cm.root?.children.map((c) => c.componentName)).toContain("Child2A");
    expect(cm.root?.children.map((c) => c.componentName)).toContain("Child2B");
  });

  test("handles deep tree with mixed ordering", () => {
    const cm = new CheckpointManager();
    const rootId = generateTestId();
    const branchAId = generateTestId();
    const branchBId = generateTestId();

    cm.addNode({ componentName: "LeafA" }, branchAId);
    cm.addNode({ componentName: "LeafB" }, branchBId);
    cm.addNode({ componentName: "Root", id: rootId });
    cm.addNode({ componentName: "BranchA", id: branchAId }, rootId);
    cm.addNode({ componentName: "BranchB", id: branchBId }, rootId);

    const root = cm.root;
    expect(root?.componentName).toBe("Root");
    expect(root?.children).toHaveLength(2);

    const branchA = root?.children.find((c) => c.componentName === "BranchA");
    const branchB = root?.children.find((c) => c.componentName === "BranchB");

    expect(branchA?.children[0].componentName).toBe("LeafA");
    expect(branchB?.children[0].componentName).toBe("LeafB");
  });

  test("handles root node arriving after children", () => {
    const cm = new CheckpointManager();
    const rootId = generateTestId();
    const childId = cm.addNode({ componentName: "Child" }, rootId);
    cm.addNode({ componentName: "Grandchild" }, childId);
    cm.addNode({ componentName: "Root", id: rootId });

    expect(cm.root?.componentName).toBe("Root");
    expect(cm.root?.children[0].componentName).toBe("Child");
    expect(cm.root?.children[0].children[0].componentName).toBe("Grandchild");
  });

  test("handles complex reordering with multiple levels", () => {
    const cm = new CheckpointManager();
    const rootId = generateTestId();
    const branchAId = generateTestId();
    const branchBId = generateTestId();

    cm.addNode({ componentName: "LeafA" }, branchAId);
    cm.addNode({ componentName: "LeafB" }, branchBId);
    cm.addNode({ componentName: "LeafC" }, branchAId);

    cm.addNode({ componentName: "BranchB", id: branchBId }, rootId);
    cm.addNode({ componentName: "Root", id: rootId });
    cm.addNode({ componentName: "BranchA", id: branchAId }, rootId);

    const root = cm.root;
    expect(root?.componentName).toBe("Root");
    expect(root?.children).toHaveLength(2);

    const branchA = root?.children.find((c) => c.componentName === "BranchA");
    const branchB = root?.children.find((c) => c.componentName === "BranchB");

    // Verify all nodes are connected properly
    expect(branchA?.children.map((c) => c.componentName)).toContain("LeafA");
    expect(branchA?.children.map((c) => c.componentName)).toContain("LeafC");
    expect(branchB?.children.map((c) => c.componentName)).toContain("LeafB");

    // Verify tree integrity - every node should have correct parent reference
    function verifyNodeParentRefs(node: ExecutionNode) {
      for (const child of node.children) {
        expect(child.parentId).toBe(node.id);
        verifyNodeParentRefs(child);
      }
    }
    verifyNodeParentRefs(root!);
  });
});
