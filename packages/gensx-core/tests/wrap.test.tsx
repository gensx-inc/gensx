import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { executeWithCheckpoints } from "./utils/executeWithCheckpoints.js";

suite("wrap", () => {
  suite("wrapFunction", () => {
    test("wraps a simple function into a component", async () => {
      const MyFunction = (input: { name: string }) => {
        return `Hello ${input.name}!`;
      };

      const MyComponent = gensx.wrapFunction(MyFunction);

      const result = await gensx.execute(<MyComponent name="World" />);
      expect(result).toBe("Hello World!");
    });

    test("wraps an async function into a component", async () => {
      const MyAsyncFunction = async (input: { delay: number }) => {
        await setTimeout(input.delay);
        return `Delayed by ${input.delay}ms`;
      };

      const MyComponent = gensx.wrapFunction(MyAsyncFunction);

      const result = await gensx.execute(<MyComponent delay={10} />);
      expect(result).toBe("Delayed by 10ms");
    });

    test("uses custom component name when provided", async () => {
      const MyFunction = (_input: { value: string }) => "test";
      const MyComponent = gensx.wrapFunction(MyFunction, "CustomName");

      const { result, checkpoints } = await executeWithCheckpoints<string>(
        <MyComponent value="test" />,
      );

      expect(result).toBe("test");
      const finalCheckpoint = checkpoints[checkpoints.length - 1];
      expect(finalCheckpoint.componentName).toBe("CustomName");
    });

    test("falls back to function name when no custom name provided", async () => {
      const NamedFunction = (input: { value: string }) => input.value;
      const MyComponent = gensx.wrapFunction(NamedFunction);

      const { result, checkpoints } = await executeWithCheckpoints<string>(
        <MyComponent value="test" />,
      );

      expect(result).toBe("test");
      const finalCheckpoint = checkpoints[checkpoints.length - 1];
      expect(finalCheckpoint.componentName).toBe("NamedFunction");
    });

    test("uses AnonymousComponent when function has no name", async () => {
      const MyComponent = gensx.wrapFunction(
        (input: { value: string }) => input.value,
      );

      const { result, checkpoints } = await executeWithCheckpoints<string>(
        <MyComponent value="test" />,
      );

      expect(result).toBe("test");
      const finalCheckpoint = checkpoints[checkpoints.length - 1];
      expect(finalCheckpoint.componentName).toBe("AnonymousComponent");
    });
  });

  suite("wrap", () => {
    test("wraps an SDK with nested functions", async () => {
      // Create a mock SDK with nested functions
      const mockSDK = {
        chat: {
          completions: {
            create: async (input: { prompt: string }) => {
              await setTimeout(10);
              return `Response to: ${input.prompt}`;
            },
          },
        },
        embeddings: {
          create: async (_input: { text: string }) => {
            await setTimeout(10);
            return [0.1, 0.2, 0.3];
          },
        },
      };

      const wrappedSDK = gensx.wrap(mockSDK);

      // Test nested function calls
      const result1 = await wrappedSDK.chat.completions.create({
        prompt: "Hello",
      });
      expect(result1).toBe("Response to: Hello");

      const result2 = await wrappedSDK.embeddings.create({ text: "Test" });
      expect(result2).toEqual([0.1, 0.2, 0.3]);
    });

    test("preserves non-function properties", async () => {
      const mockSDK = {
        version: "1.0.0",
        config: {
          apiKey: "test-key",
          maxTokens: 100,
        },
        generate: async (input: { text: string }) => {
          await setTimeout(10);
          return input.text;
        },
      };

      const wrappedSDK = gensx.wrap(mockSDK);

      // Test that non-function properties are preserved
      expect(wrappedSDK.version).toBe("1.0.0");
      expect(wrappedSDK.config).toEqual({
        apiKey: "test-key",
        maxTokens: 100,
      });

      // Test that functions are wrapped
      const result = await wrappedSDK.generate({ text: "test" });
      expect(result).toBe("test");
    });

    test("uses prefix in component names when provided", async () => {
      const mockSDK = {
        generate: async (input: { text: string }) => {
          await setTimeout(10);
          return input.text;
        },
      };

      const wrappedSDK = gensx.wrap(mockSDK, { prefix: "MySDK" });

      const { result, checkpoints } = await executeWithCheckpoints<string>(
        <wrappedSDK.generate text="test" />,
      );

      expect(result).toBe("test");
      const finalCheckpoint = checkpoints[checkpoints.length - 1];
      expect(finalCheckpoint.componentName).toBe("MySDK.sdk.generate");
    });

    test("handles SDK with constructor name", async () => {
      class TestSDK {
        async generate(input: { text: string }) {
          await setTimeout(10);
          return input.text;
        }
      }

      const wrappedSDK = gensx.wrap(new TestSDK());

      const { result, checkpoints } = await executeWithCheckpoints<string>(
        <wrappedSDK.generate text="test" />,
      );

      expect(result).toBe("test");
      const finalCheckpoint = checkpoints[checkpoints.length - 1];
      expect(finalCheckpoint.componentName).toBe("testsdk.generate");
    });

    test("handles SDK without constructor name", async () => {
      const mockSDK = Object.create(null) as {
        generate: (input: { text: string }) => Promise<string>;
      };
      mockSDK.generate = async (input: { text: string }) => {
        await setTimeout(10);
        return input.text;
      };

      const wrappedSDK = gensx.wrap(mockSDK);

      const { result, checkpoints } = await executeWithCheckpoints<string>(
        <wrappedSDK.generate text="test" />,
      );

      expect(result).toBe("test");
      const finalCheckpoint = checkpoints[checkpoints.length - 1];
      expect(finalCheckpoint.componentName).toBe("sdk.generate");
    });
  });
});
