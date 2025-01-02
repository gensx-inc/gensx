import { setTimeout } from "timers/promises";

import { gsx, Streamable } from "@/index";

suite("streaming", () => {
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
    });

    test("returns the results directly", async () => {
      const result = await gsx.execute<string>(<Component foo="bar" />);
      expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
    });

    test("returns a streamable", async () => {
      const result = await gsx.execute<Streamable>(
        <Component stream={true} foo="bar" />,
      );
      expect("next" in result).toBe(true);
      expect(Symbol.asyncIterator in result).toBe(true);
      let accumulated = "";
      for await (const token of result) {
        accumulated += token;
      }
      expect(accumulated).toEqual("Hello World!\n\nHere is the prompt\nbar");
    });

    test("can be used with children as a stream", async () => {
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

    test("can be used with children without streaming", async () => {
      let result = "";
      await gsx.execute(
        <Component foo="bar">
          {(response: string) => (result = response)}
        </Component>,
      );
      expect(result).toEqual("Hello World!\n\nHere is the prompt\nbar");
    });
  });

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

    test("returns the results directly", async () => {
      const result = await gsx.execute<string>(<Component foo="bar" />);
      expect(result).toEqual("Hello World!\n\nbar");
    });

    test("returns a streamable", async () => {
      const result = await gsx.execute<Streamable>(
        <Component stream={true} foo="bar" />,
      );
      expect("next" in result).toBe(true);
      expect(Symbol.asyncIterator in result).toBe(true);
      let accumulated = "";
      for await (const token of result) {
        accumulated += token;
      }
      expect(accumulated).toEqual("Hello World!\n\nbar");
    });

    test("can be used with children as a stream", async () => {
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
      expect(result).toEqual("Hello World!\n\nbar");
    });

    test("can be used with children without streaming", async () => {
      let result = "";
      await gsx.execute(
        <Component foo="bar">
          {(response: string) => {
            result = response;
          }}
        </Component>,
      );
      expect(result).toEqual("Hello World!\n\nbar");
    });
  });
});
