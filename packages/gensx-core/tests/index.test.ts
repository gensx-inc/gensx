import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";

suite("gensx", () => {
  test("returns a result", async () => {
    const MyComponent = gensx.Component<{ foo: string }, string>(
      "MyComponent",
      async ({ foo }) => {
        await setTimeout(0);
        return foo;
      },
    );
    const result = await MyComponent.run({ foo: "bar" });
    expect(result).toBe("bar");
  });

  test("passes result to child function", async () => {
    const MyComponent = gensx.Component<{ foo: string }, string>(
      "MyComponent",
      async ({ foo }) => {
        await setTimeout(0);
        return foo;
      },
    );

    const PipeComponent = MyComponent.pipe(async (foo: string) => {
      await setTimeout(0);
      return foo + " world";
    });

    const result = await PipeComponent.run({ foo: "bar" });
    expect(result).toBe("bar world");
  });

  test("returns result from nested child component", async () => {
    const MyComponent = gensx.Component<{ foo: string }, string>(
      "MyComponent",
      async ({ foo }) => {
        await setTimeout(0);
        return "hello " + foo;
      },
    );

    const NestedComponent = MyComponent.pipe((foo: string) =>
      MyComponent.run({ foo: foo + " world" }),
    );

    const result = await NestedComponent.run({ foo: "bar" });
    expect(result).toBe("hello hello bar world");
  });

  test("returns results from an object of child components", async () => {
    const Doubler = gensx.Component<{ input: string }, string>(
      "Doubler",
      async ({ input }) => {
        await setTimeout(0);
        return `${input}${input}`;
      },
    );

    const DoublerTwice = Doubler.pipe((result: string) =>
      Doubler.run({ input: result }),
    );

    const MyComponent = gensx.Component<
      { input: string },
      { once: string; twice: string }
    >("MyComponent", async ({ input }) => {
      await setTimeout(0);
      const once = await Doubler.run({ input });
      const twice = await DoublerTwice.run({ input });

      return {
        once,
        twice,
      };
    });

    const result = await MyComponent.run({ input: "foo" });
    expect(result).toEqual({
      once: "foofoo",
      twice: "foofoofoofoo",
    });
  });

  test("returns results from a fragment child", async () => {
    const Doubler = gensx.Component<{ input: string }, string>(
      "Doubler",
      async ({ input }) => {
        await setTimeout(0);
        return `${input}${input}`;
      },
    );

    const DoublerTwice = Doubler.pipe((result: string) =>
      Doubler.run({ input: result }),
    );

    const MyComponent = gensx.Component<{ input: string }, string[]>(
      "MyComponent",
      async ({ input }) => {
        await setTimeout(0);
        const first = await Doubler.run({ input });
        const second = await DoublerTwice.run({ input });

        return [first, second];
      },
    );

    const result = await MyComponent.run({ input: "foo" });
    expect(result).toEqual(["foofoo", "foofoofoofoo"]);
  });

  test("returns results from an array of child components", async () => {
    const Doubler = gensx.Component<{ input: string }, string>(
      "Doubler",
      async ({ input }) => {
        await setTimeout(0);
        return `${input}${input}`;
      },
    );

    const DoublerTwice = Doubler.pipe((result: string) =>
      Doubler.run({ input: result }),
    );

    const MyComponent = gensx.Component<{ input: string }, [string, string]>(
      "MyComponent",
      async ({ input }) => {
        await setTimeout(0);
        const first = await Doubler.run({ input });
        const second = await DoublerTwice.run({ input });

        return [first, second];
      },
    );

    const result = await MyComponent.run({ input: "foo" });
    expect(result).toEqual(["foofoo", "foofoofoofoo"]);
  });

  test("returns results from a fork/join operation", async () => {
    const Doubler = gensx.Component<{ input: string }, string>(
      "Doubler",
      async ({ input }) => {
        await setTimeout(0);
        return `${input}${input}`;
      },
    );

    const MyComponent = gensx.Component<{ input: string }, string>(
      "MyComponent",
      async ({ input }) => {
        await setTimeout(0);
        return input;
      },
    );

    const ForkJoinComponent = MyComponent.fork(
      (result: string) => Doubler.run({ input: result }),
      () => Doubler.run({ input: "bar" }),
    ).join((doubledResult, barResult) => [doubledResult, barResult]);

    const result = await ForkJoinComponent.run({ input: "foo" });
    expect(result).toEqual(["foofoo", "barbar"]);
  });
});
