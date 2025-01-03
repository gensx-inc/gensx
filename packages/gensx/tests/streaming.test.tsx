import { setTimeout } from "timers/promises";

import { gsx, Streamable } from "@/index";

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
<<<<<<< HEAD
  test("returns the stream immediately without pre-resolving", async () => {
    const DelayedComponent = gsx.StreamComponent<{ foo: string }>(({ foo }) => {
      return streamWithDelay(foo);
||||||| 4041a30
  suite("for an AsyncIterableIterator", () => {
    const Component = gsx.StreamComponent<{ foo: string }>(function ({ foo }) {
      // const result = await llm.completeStream(prompt);
      // return result.stream();
      function* stream() {
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
      const generator = stream();
      const iterator: AsyncIterableIterator<string> = {
        next: async () => {
          const result = generator.next();
          await setTimeout(10);
          return result;
        },
        [Symbol.asyncIterator]: () => iterator,
      };

      return iterator;
=======
  suite("for an AsyncIterableIterator", () => {
    const Component = gsx.StreamComponent<{ foo: string }>(function ({ foo }) {
      // const result = await llm.completeStream(prompt);
      // return result.stream();
      function* stream() {
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
      const generator = stream();
      const iterator: AsyncIterableIterator<string> = {
        next: async () => {
          const result = generator.next();
          await setTimeout(0);
          return result;
        },
        [Symbol.asyncIterator]: () => iterator,
      };

      return iterator;
>>>>>>> main
    });

    const start = performance.now();
    const result = await gsx.execute<Streamable>(
      <DelayedComponent stream={true} foo="bar" />,
    );

    // Get just the first token, the component delays for 1 second before yielding the first token
    const firstToken = await result.next();
    const timeToFirstToken = performance.now() - start;

    expect(firstToken.value).toBe("Hello ");
    expect(timeToFirstToken).toBeLessThan(5);
  });

<<<<<<< HEAD
  // Test both async and sync versions of the component
  for (const isAsync of [true, false]) {
    suite(
      `for a ${isAsync ? "AsyncIterableIterator" : "IterableIterator"}`,
      () => {
        const Component = gsx.StreamComponent<{ foo: string }>(function ({
          foo,
        }) {
          let iterator: Streamable;
||||||| 4041a30
  suite("for a Generator function", () => {
    const Component = gsx.StreamComponent<{ foo: string }>(async function* ({
      foo,
    }) {
      yield "Hello ";
      yield "World";
      yield "!\n\n";
      for (const char of foo) {
        await setTimeout(1);
        yield char;
      }
    });
=======
  suite("for a Generator function", () => {
    const Component = gsx.StreamComponent<{ foo: string }>(async function* ({
      foo,
    }) {
      yield "Hello ";
      yield "World";
      yield "!\n\n";
      for (const char of foo) {
        await setTimeout(0);
        yield char;
      }
    });
>>>>>>> main

          if (isAsync) {
            iterator = stream(foo);
          } else {
            iterator = iterate(foo);
          }

          return iterator;
        });

        test("returns the results directly", async () => {
          const result = await gsx.execute<string>(<Component foo="bar" />);
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
        });

        test("returns a streamable", async () => {
          const result = await gsx.execute<Streamable>(
            <Component stream={true} foo="bar" />,
          );
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
          await gsx.execute(
            <Component stream={true} foo="bar">
              {async (response: Streamable) => {
                for await (const token of response) {
                  result += token;
                }
              }}
            </Component>,
          );
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
        });

        test("can be used with child function without streaming", async () => {
          let result = "";
          await gsx.execute(
            <Component foo="bar">
              {(response: string) => {
                result = response;
              }}
            </Component>,
          );
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
        });

        test("can be used with async child function without streaming", async () => {
          let result = "";
          await gsx.execute(
            <Component foo="bar">
              {async (response: string) => {
                await setTimeout(0);
                result = response;
              }}
            </Component>,
          );
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
        });

        test("stacked streaming components return a streamable for stream=true", async () => {
          const StreamPassThrough = gsx.StreamComponent<{ input: string }>(
            async ({ input }) => {
              await setTimeout(0);
              return <Component stream={true} foo={input} />;
            },
          );
          const result = await gsx.execute<Streamable>(
            <StreamPassThrough input="foo" stream={true} />,
          );
          let accumulated = "";
          for await (const token of result) {
            accumulated += token;
          }
          expect(accumulated).toEqual(
            "Hello World!\n\nHere is the prompt\nfoo",
          );
        });

        test("stacked streaming components return a string for stream=false", async () => {
          const StreamPassThrough = gsx.StreamComponent<{ input: string }>(
            async ({ input }) => {
              await setTimeout(0);
              return <Component stream={true} foo={input} />;
            },
          );
          const result = await gsx.execute<string>(
            <StreamPassThrough input="foo" />,
          );
          expect(result).toEqual("Hello World!\n\nHere is the prompt\nfoo");
        });
      },
    );
  }
});
