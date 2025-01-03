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

suite("streaming", () => {
  // Test both async and sync versions of the component
  for (const isAsync of [true, false]) {
    suite(
      `for a ${isAsync ? "AsyncIterableIterator" : "IterableIterator"}`,
      () => {
        const Component = gsx.StreamComponent<{ foo: string }>(function ({
          foo,
        }) {
          let iterator: Streamable;

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
