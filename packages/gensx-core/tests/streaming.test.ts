import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { Streamable } from "../src/types.js";

async function* stream(foo: string) {
  yield "Hello ";
  yield "World";
  yield "!\n\n";
  yield "H";
  yield "e";
  yield "r";
  yield "e";
  yield " ";
  yield "i";
  yield "s";
  yield " ";
  yield "t";
  yield "h";
  yield "e";
  yield " ";
  yield "p";
  yield "r";
  yield "o";
  yield "m";
  yield "p";
  yield "t";
  yield "\n";
  for (const char of foo) {
    await setTimeout(0);
    yield char;
  }
}

function* iterate(foo: string) {
  yield "Hello ";
  yield "World";
  yield "!\n\n";
  yield "H";
  yield "e";
  yield "r";
  yield "e";
  yield " ";
  yield "i";
  yield "s";
  yield " ";
  yield "t";
  yield "h";
  yield "e";
  yield " ";
  yield "p";
  yield "r";
  yield "o";
  yield "m";
  yield "p";
  yield "t";
  yield "\n";
  for (const char of foo) {
    yield char;
  }
}

async function* streamWithDelay(foo: string) {
  yield "Hello ";
  // Add artificial delay only after first token
  await setTimeout(1000);
  yield "World";
  yield "! " + foo;
}

suite("streaming", () => {
  test("returns the stream immediately without pre-resolving", async () => {
    const DelayedComponent = gensx.StreamComponent<{ foo: string }>(
      "DelayedComponent",
      ({ foo }) => {
        return streamWithDelay(foo);
      },
    );

    const start = performance.now();
    const result = await DelayedComponent.run({ foo: "bar", stream: true });

    // Get just the first token, the component delays for 1 second before yielding the first token
    const firstToken = await result.next();
    const timeToFirstToken = performance.now() - start;

    expect(firstToken.value).toBe("Hello ");
    // The delay is 1 second, so this gives us a big amount of leeway
    expect(timeToFirstToken).toBeLessThan(100);
  });

  // Test both async and sync versions of the component
  for (const isAsync of [true, false]) {
    suite(
      `for a ${isAsync ? "AsyncIterableIterator" : "IterableIterator"}`,
      () => {
        const MyComponent = gensx.StreamComponent<{ foo: string }>(
          "MyComponent",
          ({ foo }) => {
            let iterator: Streamable;

            if (isAsync) {
              iterator = stream(foo);
            } else {
              iterator = iterate(foo);
            }

            return iterator;
          },
        );

        test("returns the results directly", async () => {
          const result = await MyComponent.run({ foo: "bar" });
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
        });

        test("returns a streamable", async () => {
          const result = await MyComponent.run({ foo: "bar", stream: true });
          let accumulated = "";
          for await (const token of result) {
            accumulated += token;
          }
          expect(accumulated).toEqual(
            "Hello World!\n\nHere is the prompt\nbar",
          );
        });

        test("can be used with async child function as a stream", async () => {
          let result = "";
          await MyComponent.pipe(async (response) => {
            for await (const token of response as Streamable) {
              result += token;
            }
          }).run({ foo: "bar", stream: true });
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
        });

        test("can be used with child function without streaming", async () => {
          let result = "";
          await MyComponent.pipe((response) => {
            result = response;
          }).run({ foo: "bar" });
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
        });

        test("can be used with async child function without streaming", async () => {
          let result = "";
          await MyComponent.pipe(async (response: string) => {
            await setTimeout(0);
            result = response;
          }).run({ foo: "bar" });
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
        });

        test("stacked streaming components return a streamable for stream=true", async () => {
          const StreamPassThrough = gensx.StreamComponent<{
            input: string;
          }>("StreamPassThrough", async ({ input }) => {
            await setTimeout(0);
            return MyComponent.run({ foo: input, stream: true });
          });

          const result = await StreamPassThrough.run({
            input: "foo",
            stream: true,
          });
          let accumulated = "";
          for await (const token of result) {
            accumulated += token;
          }
          expect(accumulated).toEqual(
            "Hello World!\n\nHere is the prompt\nfoo",
          );
        });

        test("stacked streaming components return a string for stream=false", async () => {
          const StreamPassThrough = gensx.StreamComponent<{ input: string }>(
            "StreamPassThrough",
            async ({ input }) => {
              await setTimeout(0);
              return MyComponent.run({ foo: input, stream: true });
            },
          );
          const result = await StreamPassThrough.run({ input: "foo" });
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nfoo");
        });

        test("nested children with stream=true receive Streamable type", async () => {
          await MyComponent.pipe(async (response) => {
            // TypeScript should infer response as Streamable
            const stream: Streamable = response as Streamable;
            let accumulated = "";
            for await (const token of stream) {
              accumulated += token;
            }
            // Use a string literal instead of stringifying the stream
            return MyComponent.run({ foo: accumulated, stream: true });
          }).run({ foo: "bar", stream: true });
        });

        test("nested children with stream=false receive string type", async () => {
          await MyComponent.pipe((response) => {
            // TypeScript should infer response as string
            const str: string = response;
            return MyComponent.run({ foo: str });
          }).run({ foo: "bar" });
        });
      },
    );
  }
});
