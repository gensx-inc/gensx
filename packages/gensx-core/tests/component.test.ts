import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { Streamable } from "../src/types.js";
import { executeWithCheckpoints } from "./utils/executeWithCheckpoints.js";

suite("component", () => {
  test("can create anonymous component", async () => {
    const AnonymousComponent = gensx.Component<{}, string>(
      "AnonymousComponent",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const result = await AnonymousComponent.run({});
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

    const result = await NamedComponent.run({});
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

    const { result, checkpoints } = await executeWithCheckpoints(() =>
      TestComponent.run({ componentOpts: { name: "CustomName" } }),
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

    const { result, checkpoints } = await executeWithCheckpoints(() =>
      TestComponent.run({}),
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
      await executeWithCheckpoints(() =>
        TestStreamComponent.run({
          componentOpts: { name: "CustomStreamName" },
          stream: true,
        }),
      );

    // Collect streaming results
    let streamedContent = "";
    for await (const token of result as Streamable) {
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
    const childComponentName = "CustomChild";
    const parentComponentName = "CustomParent";

    // We need to track the child component execution separately
    let childComponentExecuted = false;

    const ChildComponent = gensx.Component<{}, string>("ChildOriginal", () => {
      childComponentExecuted = true;
      return "child";
    });

    const ParentComponent = gensx.Component<{}, string>(
      "ParentOriginal",
      () => {
        return ChildComponent.run({
          componentOpts: { name: childComponentName },
        });
      },
    );

    const { result, checkpoints } = await executeWithCheckpoints(() =>
      ParentComponent.run({
        componentOpts: { name: parentComponentName },
      }),
    );

    expect(childComponentExecuted).toBe(true);
    expect(result).toBe("child");

    // Find the checkpoint for the parent component
    const finalCheckpoint = checkpoints[checkpoints.length - 1];
    expect(finalCheckpoint.componentName).toBe(parentComponentName);

    // Find the child component checkpoint
    const childCheckpoint = finalCheckpoint.children[0];
    expect(childCheckpoint.componentName).toBe(childComponentName);
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

    const result = await AsyncIterableComponent.run({});

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

      // @ts-expect-error - This should be an error because foo is not a valid prop
      await TestComponent.run({ input: "World", foo: "bar" });
    });

    test("props types and return types are enforced for StreamComponent", async () => {
      const TestComponent = gensx.StreamComponent<{ input: string }>(
        "TestComponent",
        async function* ({ input }) {
          await setTimeout(1); // Add await to fix linter warning
          yield input;
        },
      );

      const result = await TestComponent.run({ input: "test" });
      expect(typeof result).toBe("string");

      const streamResult = await TestComponent.run({
        input: "test",
        stream: true,
      });

      // When stream is true, we should get an AsyncGenerator
      expect(
        typeof streamResult !== "string" &&
          Symbol.asyncIterator in streamResult,
      ).toBe(true);
    });
  });

  test("can pass component props with .props()", async () => {
    const TestComponent = gensx.Component<{ input: string }, string>(
      "TestComponent",
      async ({ input }) => {
        await setTimeout(0);
        return `Hello ${input}`;
      },
    );

    const boundComponent = TestComponent.props({ input: "World" });
    const result = await boundComponent.run({});
    expect(result).toBe("Hello World");
  });

  test("can transform component result with .pipe()", async () => {
    const TestComponent = gensx.Component<{ input: string }, string>(
      "TestComponent",
      async ({ input }) => {
        await setTimeout(0);
        return `Hello ${input}`;
      },
    );

    const transformedComponent = TestComponent.pipe((result) =>
      result.toUpperCase(),
    );
    const result = await transformedComponent.run({ input: "World" });
    expect(result).toBe("HELLO WORLD");
  });

  test("can create conditional flows with .branch()", async () => {
    const StringLength = gensx.Component<{ input: string }, number>(
      "StringLength",
      ({ input }) => input.length,
    );

    const categorizeText = StringLength.branch(
      (length) => length > 10,
      () => "Long text",
      () => "Short text",
    );

    const shortResult = await categorizeText.run({ input: "Hello" });
    expect(shortResult).toBe("Short text");

    const longResult = await categorizeText.run({
      input: "Hello World, how are you today?",
    });
    expect(longResult).toBe("Long text");
  });

  test("can map array results with .map()", async () => {
    const Provider = gensx.Component<{}, string[]>("Provider", () => [
      "one",
      "two",
      "three",
    ]);

    const Mapper = Provider.map<string>((item: string) => item.toUpperCase());
    const result = await Mapper.run({});
    expect(result).toEqual(["ONE", "TWO", "THREE"]);
  });

  test("can execute multiple streams with fork/join", async () => {
    const TextProvider = gensx.Component<{}, string>(
      "TextProvider",
      () => "Hello World",
    );

    const result = await TextProvider.fork(
      (text) => text.toUpperCase(),
      (text) => text.length,
      (text) => text.split(" "),
    )
      .join((upper, length, parts) => ({
        uppercased: upper,
        length,
        parts,
      }))
      .run({});

    expect(result).toEqual({
      uppercased: "HELLO WORLD",
      length: 11,
      parts: ["Hello", "World"],
    });
  });

  test("withProvider passes provider to component", async () => {
    const contextValue = { config: "test-value" };
    const provider = gensx.createProvider(contextValue);

    const GetContext = gensx.Component<{}, typeof contextValue>(
      "GetContext",
      () => {
        // In a real component, we'd use useContext here
        return contextValue;
      },
    );

    const result = await GetContext.withProvider(contextValue).run({});
    expect(result).toEqual(contextValue);

    // Or using provider.execute
    const result2 = await provider.execute(GetContext, {});
    expect(result2).toEqual(contextValue);
  });

  test("can pass props to component", async () => {
    const TestComponent = gensx.Component<{ input: string }, string>(
      "TestComponent",
      async ({ input }) => {
        await setTimeout(0);
        return `Hello ${input}`;
      },
    );

    // Run directly with props
    const result = await TestComponent.run({ input: "World" });
    expect(result).toBe("Hello World");

    // Run with pre-bound props
    const boundComponent = TestComponent.props({ input: "Universe" });
    const result2 = await boundComponent.run({});
    expect(result2).toBe("Hello Universe");
  });

  test("stream component supports streaming mode", async () => {
    const TestStreamComponent = gensx.StreamComponent<{}>(
      "TestStreamComponent",
      async function* () {
        await setTimeout(0);
        yield "hello";
        yield " ";
        yield "world";
      },
    );

    // Run in non-streaming mode
    const stringResult = await TestStreamComponent.run({});
    expect(typeof stringResult).toBe("string");
    expect(stringResult).toBe("hello world");

    // Run in streaming mode
    const streamResult = await TestStreamComponent.run({ stream: true });

    // Check if it's a streamable
    expect(
      typeof streamResult !== "string" && Symbol.asyncIterator in streamResult,
    ).toBe(true);

    // Collect streaming results
    let streamedContent = "";
    for await (const token of streamResult as AsyncIterable<string>) {
      streamedContent += token;
    }
    expect(streamedContent).toBe("hello world");
  });

  test("nested components with pipe", async () => {
    const ParentComponent = gensx.Component<{}, string>(
      "ParentComponent",
      () => {
        return "parent";
      },
    );

    const ChildComponent = gensx.Component<{ input: string }, string>(
      "ChildComponent",
      ({ input }) => {
        return `child of ${input}`;
      },
    );

    // Chain components with pipe
    const result = await ParentComponent.pipe((parent) =>
      ChildComponent.run({ input: parent }),
    ).run({});

    expect(result).toBe("child of parent");
  });

  test("component with branch conditional", async () => {
    const LengthComponent = gensx.Component<{ input: string }, number>(
      "LengthComponent",
      ({ input }) => {
        return input.length;
      },
    );

    // Create a branching flow
    const branchingFlow = LengthComponent.branch(
      (length) => length > 5,
      () => "long string",
      () => "short",
    );

    const shortResult = await branchingFlow.run({ input: "hi" });
    expect(shortResult).toBe("short");

    const longResult = await branchingFlow.run({ input: "hello world" });
    expect(longResult).toBe("long string");
  });

  test("component with mapping", async () => {
    const ArrayProvider = gensx.Component<{}, number[]>("ArrayProvider", () => [
      1, 2, 3,
    ]);

    const mappedComponent = ArrayProvider.map<number>((num: number) => num * 2);
    const result = await mappedComponent.run({});
    expect(result).toEqual([2, 4, 6]);
  });

  test("component with fork/join", async () => {
    const NameProvider = gensx.Component<{}, string>(
      "NameProvider",
      () => "John Doe",
    );

    const result = await NameProvider.fork(
      (name) => name.toUpperCase(),
      (name) => name.length,
      (name) => name.split(" "),
    )
      .join((upper, length, parts) => ({
        upperName: upper,
        nameLength: length,
        nameParts: parts,
      }))
      .run({});

    expect(result).toEqual({
      upperName: "JOHN DOE",
      nameLength: 8,
      nameParts: ["John", "Doe"],
    });
  });
});
