import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { Component } from "@/component";
import { createContext, gsx, useContext } from "@/index.js";

suite("context", () => {
  test("can create and use context with default value", async () => {
    const TestContext = createContext("default");

    const Consumer = Component<{}, string>(
      async () => {
        await setTimeout(0);
        const value = useContext(TestContext);
        return value;
      },
      { name: "Consumer" },
    );

    const result = await gsx.execute(<Consumer />);
    expect(result).toBe("default");
  });

  test("can provide and consume context value", async () => {
    const TestContext = createContext("default");

    const Consumer = Component<{}, string>(
      async () => {
        await setTimeout(0);
        const value = useContext(TestContext);
        return value;
      },
      { name: "Consumer" },
    );

    const result = await gsx.execute(
      <TestContext.Provider value="provided">
        <Consumer />
      </TestContext.Provider>,
    );

    expect(result).toBe("provided");
  });

  test("context value can be nested", async () => {
    const TestContext = createContext("default");

    const Consumer = Component<{}, string>(
      async () => {
        await setTimeout(0);
        const value = useContext(TestContext);
        return value;
      },
      { name: "Consumer" },
    );

    const result = await gsx.execute(
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

    const UserContext = createContext<User>({ name: "default", age: 0 });

    const Consumer = Component<{}, string>(
      async () => {
        await setTimeout(0);
        const user = useContext(UserContext);
        return user.name;
      },
      { name: "Consumer" },
    );

    const result = await gsx.execute(
      <UserContext.Provider value={{ name: "John", age: 30 }}>
        <Consumer />
      </UserContext.Provider>,
    );

    expect(result).toBe("John");
  });

  test("multiple contexts work independently", async () => {
    const NameContext = createContext("default-name");
    const AgeContext = createContext(0);

    const Consumer = Component<{}, { name: string; age: number }>(
      async () => {
        await setTimeout(0);
        const name = useContext(NameContext);
        const age = useContext(AgeContext);
        return { name, age };
      },
      { name: "Consumer" },
    );

    const result = await gsx.execute(
      <NameContext.Provider value="John">
        <AgeContext.Provider value={30}>
          <Consumer />
        </AgeContext.Provider>
      </NameContext.Provider>,
    );

    expect(result).toEqual({ name: "John", age: 30 });

    // Test that contexts can be nested in different orders
    const result2 = await gsx.execute(
      <AgeContext.Provider value={25}>
        <NameContext.Provider value="Jane">
          <Consumer />
        </NameContext.Provider>
      </AgeContext.Provider>,
    );

    expect(result2).toEqual({ name: "Jane", age: 25 });
  });

  test("contexts maintain independence when nested", async () => {
    const Context1 = createContext("default1");
    const Context2 = createContext("default2");

    const Consumer = Component<{}, { value1: string; value2: string }>(
      async () => {
        await setTimeout(0);
        const value1 = useContext(Context1);
        const value2 = useContext(Context2);
        return { value1, value2 };
      },
      { name: "Consumer" },
    );

    const result = await gsx.execute(
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
    const TestContext = createContext("default");

    const AsyncConsumer = Component<{}, string>(
      async () => {
        await setTimeout(0);
        const value = useContext(TestContext);
        return value;
      },
      { name: "AsyncConsumer" },
    );

    const result = await gsx.execute(
      <TestContext.Provider value="async-test">
        <AsyncConsumer />
      </TestContext.Provider>,
    );

    expect(result).toBe("async-test");
  });

  test("context values are isolated between executions", async () => {
    const TestContext = createContext("default");

    const Consumer = Component<{}, string>(
      async () => {
        await setTimeout(0);
        const value = useContext(TestContext);
        return value;
      },
      { name: "Consumer" },
    );

    // Run two executions in parallel
    const [result1, result2] = await Promise.all([
      gsx.execute(
        <TestContext.Provider value="value1">
          <Consumer />
        </TestContext.Provider>,
      ),
      gsx.execute(
        <TestContext.Provider value="value2">
          <Consumer />
        </TestContext.Provider>,
      ),
    ]);

    expect(result1).toBe("value1");
    expect(result2).toBe("value2");
  });

  test("context with complex nested async operations", async () => {
    const Context1 = createContext("default1");
    const Context2 = createContext("default2");

    const AsyncChild = Component<{}, { value1: string; value2: string }>(
      async () => {
        await setTimeout(0);
        const value1 = useContext(Context1);
        const value2 = useContext(Context2);
        return { value1, value2 };
      },
      { name: "AsyncChild" },
    );

    const AsyncParent = Component<{}, { value1: string; value2: string }>(
      async () => {
        await setTimeout(0);
        return <AsyncChild />;
      },
      { name: "AsyncParent" },
    );

    const result = await gsx.execute(
      <Context1.Provider value="outer1">
        <Context2.Provider value="outer2">
          <AsyncParent />
        </Context2.Provider>
      </Context1.Provider>,
    );

    expect(result).toEqual({ value1: "outer1", value2: "outer2" });
  });

  suite("can wrap children in a context provider", () => {
    const TestContext = createContext("default");
    const MyProvider = Component<{ value: string }, never>(
      async ({ value }) => {
        await setTimeout(0);
        const newValue = value + " wrapped";
        return <TestContext.Provider value={newValue} />;
      },
      { name: "MyProvider" },
    );

    test("returns the value from the context", async () => {
      const result = await gsx.execute<string>(
        <MyProvider value="value">
          {() => {
            const value = useContext(TestContext);
            return value;
          }}
        </MyProvider>,
      );
      expect(result).toBe("value wrapped");
    });

    test("can nest children within multiple context providers", async () => {
      const Context2 = createContext("default2");

      const Providers = Component<{ value: string }, never>(
        async props => {
          await setTimeout(0);
          return (
            <TestContext.Provider value={`${props.value} outer1`}>
              <Context2.Provider value={`${props.value} outer2`} />
            </TestContext.Provider>
          );
        },
        { name: "Providers" },
      );

      const result = await gsx.execute(
        <Providers value="value">
          {() => {
            const testValue = useContext(TestContext);
            const context2Value = useContext(Context2);
            return [testValue, context2Value];
          }}
        </Providers>,
      );
      expect(result).toEqual(["value outer1", "value outer2"]);
    });
  });
});
