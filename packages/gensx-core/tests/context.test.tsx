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

    const result = await gensx.execute(<Consumer />);
    expect(result).toBe("default");
  });

  test("can provide and consume context value", async () => {
    const TestContext = gensx.createContext("default");

    const Consumer = gensx.Component<{}, string>("Consumer", async () => {
      await setTimeout(0);
      const value = gensx.useContext(TestContext);
      return value;
    });

    const result = await gensx.execute(
      <TestContext.Provider value="provided">
        <Consumer />
      </TestContext.Provider>,
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

    const result = await gensx.execute(
      <TestContext.Provider value="outer">
        <TestContext.Provider value="inner">
          <Consumer />
        </TestContext.Provider>
      </TestContext.Provider>,
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

    const result = await gensx.execute(
      <UserContext.Provider value={{ name: "John", age: 30 }}>
        <Consumer />
      </UserContext.Provider>,
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

    const result = await gensx.execute(
      <NameContext.Provider value="John">
        <AgeContext.Provider value={30}>
          <Consumer />
        </AgeContext.Provider>
      </NameContext.Provider>,
    );

    expect(result).toEqual({ name: "John", age: 30 });

    // Test that contexts can be nested in different orders
    const result2 = await gensx.execute(
      <AgeContext.Provider value={25}>
        <NameContext.Provider value="Jane">
          <Consumer />
        </NameContext.Provider>
      </AgeContext.Provider>,
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

    const result = await gensx.execute(
      <Context1.Provider value="outer1">
        <Context2.Provider value="outer2">
          <Context1.Provider value="inner1">
            <Consumer />
          </Context1.Provider>
        </Context2.Provider>
      </Context1.Provider>,
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

    const result = await gensx.execute(
      <TestContext.Provider value="async-test">
        <AsyncConsumer />
      </TestContext.Provider>,
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
      gensx.execute(
        <TestContext.Provider value="value1">
          <Consumer />
        </TestContext.Provider>,
      ),
      gensx.execute(
        <TestContext.Provider value="value2">
          <Consumer />
        </TestContext.Provider>,
      ),
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
        return <AsyncChild />;
      },
    );

    const result = await gensx.execute(
      <Context1.Provider value="outer1">
        <Context2.Provider value="outer2">
          <AsyncParent />
        </Context2.Provider>
      </Context1.Provider>,
    );

    expect(result).toEqual({ value1: "outer1", value2: "outer2" });
  });

  suite("can wrap children in a context provider", () => {
    const TestContext = gensx.createContext("default");
    const MyProvider = gensx.Component<{ value: string }, never>(
      "MyProvider",
      async ({ value }) => {
        await setTimeout(0);
        const newValue = value + " wrapped";
        return <TestContext.Provider value={newValue} />;
      },
    );

    test("returns the value from the context", async () => {
      const result = await gensx.execute<string>(
        <MyProvider value="value">
          {() => {
            const value = gensx.useContext(TestContext);
            return value;
          }}
        </MyProvider>,
      );
      expect(result).toBe("value wrapped");
    });

    test("can nest children within multiple context providers", async () => {
      const Context2 = gensx.createContext("default2");

      const Providers = gensx.Component<{ value: string }, never>(
        "Providers",
        async (props) => {
          await setTimeout(0);
          return (
            <TestContext.Provider value={`${props.value} outer1`}>
              <Context2.Provider value={`${props.value} outer2`} />
            </TestContext.Provider>
          );
        },
      );

      const result = await gensx.execute(
        <Providers value="value">
          {() => {
            const testValue = gensx.useContext(TestContext);
            const context2Value = gensx.useContext(Context2);
            return [testValue, context2Value];
          }}
        </Providers>,
      );
      expect(result).toEqual(["value outer1", "value outer2"]);
    });

    test("enforces types", async () => {
      await gensx.execute<string>(
        // @ts-expect-error - This should be an error because foo is not a valid prop
        <MyProvider value="value" foo="bar">
          {() => gensx.useContext(TestContext)}
        </MyProvider>,
      );
    });
  });
});
