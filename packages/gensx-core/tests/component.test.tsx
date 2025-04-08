import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { Streamable } from "../src/types.js";
import {
  executeWithCheckpoints,
  executeWorkflowWithCheckpoints,
} from "./utils/executeWithCheckpoints.js";

suite("component", () => {
  test("can create anonymous component", async () => {
    const AnonymousComponent = gensx.Component<{}, string>(
      "AnonymousComponent",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const result = await gensx.execute(<AnonymousComponent />);
    expect(result).toBe("hello");
  });

  test("can create named component", async () => {
    const NamedComponent = gensx.Component<{}, string>(
      "NamedComponent",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const result = await gensx.execute(<NamedComponent />);
    expect(result).toBe("hello");
  });

  test("can override component name with componentOpts", async () => {
    const TestComponent = gensx.Component<{}, string>(
      "OriginalName",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const { result, checkpoints } = await executeWithCheckpoints<string>(
      <TestComponent componentOpts={{ name: "CustomName" }} />,
    );

    expect(checkpoints).toBeDefined();
    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    expect(result).toBe("hello");
    expect(finalCheckpoint.componentName).toBe("CustomName");
  });

  test("component name falls back to original when not provided in componentOpts", async () => {
    const TestComponent = gensx.Component<{}, string>(
      "OriginalName",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const { result, checkpoints } = await executeWithCheckpoints<string>(
      <TestComponent />,
    );

    expect(checkpoints).toBeDefined();
    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    expect(result).toBe("hello");
    expect(finalCheckpoint.componentName).toBe("OriginalName");
  });

  test("stream component supports name override with componentOpts", async () => {
    const TestStreamComponent = gensx.StreamComponent<{}>(
      "OriginalStreamName",
      async function* () {
        await setTimeout(0);
        yield "hello";
        yield " ";
        yield "world";
      },
    );

    const { result, checkpoints, checkpointManager } =
      await executeWithCheckpoints<AsyncGenerator<string>>(
        <TestStreamComponent
          componentOpts={{ name: "CustomStreamName" }}
          stream={true}
        />,
      );

    // Collect streaming results
    let streamedContent = "";
    for await (const token of result) {
      streamedContent += token;
    }

    // Wait for final checkpoint to be written
    await checkpointManager.waitForPendingUpdates();

    expect(checkpoints).toBeDefined();
    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    expect(streamedContent).toBe("hello world");
    expect(finalCheckpoint.componentName).toBe("CustomStreamName");
  });

  test("nested components can each have custom names", async () => {
    const ParentComponent = gensx.Component<{}, string>(
      "ParentOriginal",
      () => {
        return "parent";
      },
    );

    const ChildComponent = gensx.Component<{}, string>("ChildOriginal", () => {
      return "child";
    });

    const { result, checkpoints, checkpointManager } =
      await executeWithCheckpoints<string>(
        <ParentComponent componentOpts={{ name: "CustomParent" }}>
          {(_parentResult) => (
            <ChildComponent componentOpts={{ name: "CustomChild" }} />
          )}
        </ParentComponent>,
      );

    // Wait for all checkpoint updates to complete
    await checkpointManager.waitForPendingUpdates();

    expect(checkpoints).toBeDefined();
    const finalCheckpoint = checkpoints[checkpoints.length - 1];
    expect(finalCheckpoint).toBeDefined();
    const childCheckpoint = finalCheckpoint.children[0];

    expect(result).toBe("child");
    expect(finalCheckpoint.componentName).toBe("CustomParent");
    expect(childCheckpoint.componentName).toBe("CustomChild");
  });

  test("does not consume asyncIterable during execution", async () => {
    let iteratorConsumed = false;
    const AsyncIterableComponent = gensx.Component<
      {},
      AsyncIterableIterator<string>
    >("AsyncIterableComponent", async () => {
      await setTimeout(0);
      const iterator = (async function* () {
        await setTimeout(0);
        iteratorConsumed = true;
        yield "test";
      })();
      return iterator;
    });

    const result = await gensx.execute<AsyncIterableIterator<string>>(
      <AsyncIterableComponent />,
    );

    // Verify the iterator wasn't consumed during execution
    expect(iteratorConsumed).toBe(false);

    // Verify we can still consume the iterator after execution
    let consumed = false;
    for await (const value of result) {
      expect(value).toBe("test");
      consumed = true;
    }
    expect(consumed).toBe(true);
    expect(iteratorConsumed).toBe(true);
  });

  suite("type inference", () => {
    test("props types are enforced for Component", async () => {
      const TestComponent = gensx.Component<{ input: string }, string>(
        "TestComponent",
        async ({ input }) => {
          await setTimeout(0);
          return `Hello ${input}`;
        },
      );

      // @ts-expect-error - This should is an error because foo is not a valid prop
      await TestComponent.run({ input: "World", foo: "bar" });

      // @ts-expect-error - This should is an error because foo is not a valid prop
      await gensx.execute<string>(<TestComponent input="World" foo={"bar"} />);
    });

    test("props types and return types are enforced for StreamComponent", async () => {
      const TestComponent = gensx.StreamComponent<{ input: string }>(
        "TestComponent",
        async function* ({ input }) {
          await setTimeout(0);
          return `Hello ${input}`;
        },
      );

      // Verify that the return type is Streamable for streaming mode
      const _stream: Streamable = await TestComponent.run({
        input: "World",
        stream: true,
      });

      // Verify that the return type is string for non-streaming mode
      const _stream2: string = await TestComponent.run({
        input: "World",
      });

      // @ts-expect-error - This should is an error because foo is not a valid prop
      await gensx.execute<string>(<TestComponent input="World" foo={"bar"} />);
    });
  });

  suite("Component.run", () => {
    test("executes component", async () => {
      const TestComponent = gensx.Component<{ input: string }, string>(
        "TestComponent",
        async ({ input }) => {
          await setTimeout(0);
          return `Hello ${input}`;
        },
      );

      const result: string = await TestComponent.run({ input: "World" });
      expect(result).toBe("Hello World");
    });

    test("complex props", async () => {
      const ComplexComponent = gensx.Component<
        { numbers: number[]; config: { enabled: boolean } },
        { sum: number; enabled: boolean }
      >("ComplexComponent", async ({ numbers, config }) => {
        await setTimeout(0);
        return {
          sum: numbers.reduce((a, b) => a + b, 0),
          enabled: config.enabled,
        };
      });

      const result = await ComplexComponent.run({
        numbers: [1, 2, 3, 4],
        config: { enabled: true },
      });

      expect(result).toEqual({ sum: 10, enabled: true });
    });

    test("uses componentOpts", async () => {
      const NamedComponent = gensx.Component<{ value: string }, string>(
        "OriginalName",
        async ({ value }) => {
          await setTimeout(0);
          return value;
        },
      );

      const WrapperComponent = gensx.Component<{ input: string }, string>(
        "WrapperComponent",
        async ({ input }) => {
          const result = await NamedComponent.run({
            value: input,
            componentOpts: { name: "RenamedComponent" },
          });
          return result;
        },
      );

      const { result, checkpoints } =
        await executeWorkflowWithCheckpoints<string>(
          <WrapperComponent input="test" />,
        );

      expect(result).toBe("test");
      expect(checkpoints).toBeDefined();
      const checkpoint = Object.values(checkpoints)[0];
      expect(checkpoint.componentName).toBe("WorkflowComponentWrapper");
      expect(checkpoint.children[0].componentName).toBe("WrapperComponent");
      expect(checkpoint.children[0].children[0].componentName).toBe(
        "RenamedComponent",
      );
    });

    test("executes inside a component", async () => {
      const TestComponent = gensx.Component<
        { input: string },
        { processed: string }
      >("TestComponent", async ({ input }) => {
        await setTimeout(0);
        return { processed: input.toUpperCase() };
      });

      const WrapperComponent = gensx.Component<{ input: string }, string>(
        "WrapperComponent",
        async ({ input }) => {
          const result = await TestComponent.run({ input });
          return result.processed;
        },
      );

      const { result, checkpoints } =
        await executeWorkflowWithCheckpoints<string>(
          <WrapperComponent input="test" />,
        );

      expect(result).toEqual("TEST");
      expect(checkpoints).toBeDefined();
      const checkpoint = Object.values(checkpoints)[0];
      expect(checkpoint.componentName).toBe("WorkflowComponentWrapper");
      expect(checkpoint.children[0].componentName).toBe("WrapperComponent");
      expect(checkpoint.children[0].children[0].componentName).toBe(
        "TestComponent",
      );
    });
  });

  suite("StreamComponent.run", () => {
    test("executes stream component in non-streaming mode", async () => {
      const TestStreamComponent = gensx.StreamComponent<{ input: string }>(
        "TestStreamComponent",
        async function* ({ input }) {
          await setTimeout(0);
          yield "Hello ";
          await setTimeout(0);
          yield input;
        },
      );

      // The result should be typed as string when stream is not true
      const result = await TestStreamComponent.run({ input: "World" });
      expect(typeof result).toBe("string");
      expect(result).toBe("Hello World");
    });

    test("executes stream component in streaming mode", async () => {
      const TestStreamComponent = gensx.StreamComponent<{ input: string }>(
        "TestStreamComponent",
        async function* ({ input }) {
          await setTimeout(0);
          yield "Hello ";
          await setTimeout(0);
          yield input;
        },
      );

      // The result should be typed as Streamable when stream is true
      const streamResult = await TestStreamComponent.run({
        input: "World",
        stream: true,
      });

      // Check if it's an async iterable
      expect(streamResult).toBeDefined();

      // Collect streaming results
      let streamedContent = "";
      for await (const token of streamResult) {
        streamedContent += token;
      }

      expect(streamedContent).toBe("Hello World");
    });

    test("uses componentOpts", async () => {
      const TestStreamComponent = gensx.StreamComponent<{ input: string }>(
        "OriginalStreamName",
        async function* ({ input }) {
          await setTimeout(0);
          yield "Hello ";
          await setTimeout(0);
          yield input;
        },
      );

      const WrapperComponent = gensx.Component<{ input: string }, string>(
        "WrapperComponent",
        async ({ input }) => {
          const result = await TestStreamComponent.run({
            input,
            componentOpts: { name: "RenamedStreamComponent" },
          });
          return result;
        },
      );

      const { result, checkpoints } =
        await executeWorkflowWithCheckpoints<string>(
          // @ts-expect-error - This should be an error because foo is not a valid prop
          <WrapperComponent input="World" foo="bar" />,
        );

      expect(result).toBe("Hello World");
      expect(checkpoints).toBeDefined();
      const checkpoint = Object.values(checkpoints)[0];
      expect(checkpoint.componentName).toBe("WorkflowComponentWrapper");
      expect(checkpoint.children[0].componentName).toBe("WrapperComponent");
      expect(checkpoint.children[0].children[0].componentName).toBe(
        "RenamedStreamComponent",
      );
    });

    test("can be used inside another component", async () => {
      const TestStreamComponent = gensx.StreamComponent<{ input: string }>(
        "TestStreamComponent",
        async function* ({ input }) {
          await setTimeout(0);
          yield "Hello ";
          await setTimeout(0);
          yield input;
          await setTimeout(0);
          yield "!";
        },
      );

      const WrapperComponent = gensx.Component<
        { input: string; useStream?: boolean },
        string | Streamable
      >("WrapperComponent", async ({ input, useStream }) => {
        if (useStream) {
          // Correctly typed as Streamable
          return await TestStreamComponent.run({
            input,
            stream: true,
          });
        }
        // Correctly typed as string
        return await TestStreamComponent.run({ input });
      });

      // Test non-streaming mode
      const { result: nonStreamResult } =
        await executeWorkflowWithCheckpoints<string>(
          <WrapperComponent input="World" />,
        );
      expect(nonStreamResult).toBe("Hello World!");

      // Test streaming mode
      const { result: streamResult } =
        await executeWorkflowWithCheckpoints<Streamable>(
          <WrapperComponent input="World" useStream={true} />,
        );

      if (streamResult) {
        let streamedContent = "";
        for await (const token of streamResult) {
          streamedContent += token;
        }

        expect(streamedContent).toBe("Hello World!");
      } else {
        throw new Error("Stream result is undefined");
      }
    });
  });
});
