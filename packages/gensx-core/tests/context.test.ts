import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";

suite("context", () => {
  test("can create and use context with default value", async () => {
    const TestContext = gensx.createContext("default");

    const Consumer = gensx.Component<{}, string>("Consumer", async () => {
      await setTimeout(0);
      const value = gensx.useContext(TestContext);
      return value;
    });

    const result = await Consumer.run({});
    expect(result).toBe("default");
  });

  test("can provide and consume context value", async () => {
    const TestContext = gensx.createContext("default");

    const Consumer = gensx.Component<{}, string>("Consumer", async () => {
      await setTimeout(0);
      const value = gensx.useContext(TestContext);
      return value;
    });

    const result = await TestContext.Provider("provided").with(() =>
      Consumer.run({}),
    );

    expect(result).toBe("provided");
  });

  test("context value can be nested", async () => {
    const TestContext = gensx.createContext("default");

    const Consumer = gensx.Component<{}, string>("Consumer", async () => {
      await setTimeout(0);
      const value = gensx.useContext(TestContext);
      return value;
    });

    const result = await TestContext.Provider("outer").with(() =>
      TestContext.Provider("inner").with(() => Consumer.run({})),
    );

    expect(result).toBe("inner");
  });

  test("can use typed context", async () => {
    interface User {
      name: string;
      age: number;
    }

    const UserContext = gensx.createContext<User>({ name: "default", age: 0 });

    const Consumer = gensx.Component<{}, string>("Consumer", async () => {
      await setTimeout(0);
      const user = gensx.useContext(UserContext);
      return user.name;
    });

    const result = await UserContext.Provider({ name: "John", age: 30 }).with(
      () => Consumer.run({}),
    );

    expect(result).toBe("John");
  });

  test("multiple contexts work independently", async () => {
    const NameContext = gensx.createContext("default-name");
    const AgeContext = gensx.createContext(0);

    const Consumer = gensx.Component<{}, { name: string; age: number }>(
      "Consumer",
      async () => {
        await setTimeout(0);
        const name = gensx.useContext(NameContext);
        const age = gensx.useContext(AgeContext);
        return { name, age };
      },
    );

    const result = await NameContext.Provider("John").with(() =>
      AgeContext.Provider(30).with(() => Consumer.run({})),
    );

    expect(result).toEqual({ name: "John", age: 30 });

    // Test that contexts can be nested in different orders
    const result2 = await AgeContext.Provider(25).with(() =>
      NameContext.Provider("Jane").with(() => Consumer.run({})),
    );

    expect(result2).toEqual({ name: "Jane", age: 25 });
  });

  test("contexts maintain independence when nested", async () => {
    const Context1 = gensx.createContext("default1");
    const Context2 = gensx.createContext("default2");

    const Consumer = gensx.Component<{}, { value1: string; value2: string }>(
      "Consumer",
      async () => {
        await setTimeout(0);
        const value1 = gensx.useContext(Context1);
        const value2 = gensx.useContext(Context2);
        return { value1, value2 };
      },
    );

    const result = await Context1.Provider("outer1").with(() =>
      Context2.Provider("outer2").with(() =>
        Context1.Provider("inner1").with(() => Consumer.run({})),
      ),
    );

    expect(result).toEqual({ value1: "inner1", value2: "outer2" });
  });

  test("context values persist through async operations", async () => {
    const TestContext = gensx.createContext("default");

    const AsyncConsumer = gensx.Component<{}, string>(
      "AsyncConsumer",
      async () => {
        await setTimeout(0);
        const value = gensx.useContext(TestContext);
        return value;
      },
    );

    const result = await TestContext.Provider("async-test").with(() =>
      AsyncConsumer.run({}),
    );

    expect(result).toBe("async-test");
  });

  test("context values are isolated between executions", async () => {
    const TestContext = gensx.createContext("default");

    const Consumer = gensx.Component<{}, string>("Consumer", async () => {
      await setTimeout(0);
      const value = gensx.useContext(TestContext);
      return value;
    });

    // Run two executions in parallel
    const [result1, result2] = await Promise.all([
      TestContext.Provider("value1").with(() => Consumer.run({})),
      TestContext.Provider("value2").with(() => Consumer.run({})),
    ]);

    expect(result1).toBe("value1");
    expect(result2).toBe("value2");
  });

  test("context with complex nested async operations", async () => {
    const Context1 = gensx.createContext("default1");
    const Context2 = gensx.createContext("default2");

    const AsyncChild = gensx.Component<{}, { value1: string; value2: string }>(
      "AsyncChild",
      async () => {
        await setTimeout(0);
        const value1 = gensx.useContext(Context1);
        const value2 = gensx.useContext(Context2);
        return { value1, value2 };
      },
    );

    const AsyncParent = gensx.Component<{}, { value1: string; value2: string }>(
      "AsyncParent",
      async () => {
        await setTimeout(0);
        return AsyncChild.run({});
      },
    );

    const result = await Context1.Provider("outer1").with(() =>
      Context2.Provider("outer2").with(() => AsyncParent.run({})),
    );

    expect(result).toEqual({ value1: "outer1", value2: "outer2" });
  });

  suite("can wrap children in a context provider", () => {
    const TestContext = gensx.createContext("default");
    const MyProvider = gensx.Component<{ value: string }, string>(
      "MyProvider",
      async ({ value }) => {
        await setTimeout(0);
        const newValue = value + " wrapped";

        // Use the context directly with the correct pattern
        return gensx.withContext(
          gensx.getCurrentContext().withContext({
            [TestContext.symbol]: newValue,
          }),
          async () => {
            const value = await Promise.resolve(gensx.useContext(TestContext));
            return value;
          },
        );
      },
    );

    test("returns the value from the context", async () => {
      const result = await MyProvider.run({ value: "value" });
      expect(result).toBe("value wrapped");
    });

    test("can nest children within multiple context providers", async () => {
      const Context2 = gensx.createContext("default2");

      const Providers = gensx.Component<{ value: string }, [string, string]>(
        "Providers",
        async (props) => {
          await setTimeout(0);

          // Create a nested context with both contexts using the correct pattern
          return gensx.withContext(
            gensx.getCurrentContext().withContext({
              [TestContext.symbol]: `${props.value} outer1`,
              [Context2.symbol]: `${props.value} outer2`,
            }),
            async () => {
              const testValue = await Promise.resolve(
                gensx.useContext(TestContext),
              );
              const context2Value = await Promise.resolve(
                gensx.useContext(Context2),
              );
              return [testValue, context2Value];
            },
          );
        },
      );

      const result = await Providers.run({ value: "value" });
      expect(result).toEqual(["value outer1", "value outer2"]);
    });

    test("enforces types", async () => {
      // @ts-expect-error - This should be an error because foo is not a valid prop
      await MyProvider.run({ value: "value", foo: "bar" });
    });
  });
});
