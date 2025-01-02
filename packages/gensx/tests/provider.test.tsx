import { setTimeout } from "timers/promises";

import { getCurrentContext, gsx } from "@/index";

declare module "@/types" {
  interface WorkflowContext {
    foo?: string;
  }
}

suite("provider", () => {
  test("can add to the context", async () => {
    const Provider = gsx.Provider(() => {
      return { foo: "bar" };
    });

    const Component = gsx.Component<Record<string, never>, string>(async () => {
      const context = getCurrentContext();
      await setTimeout(0);
      const foo = context.get("foo");
      if (!foo) {
        throw new Error("foo is not set");
      }
      return foo;
    });

    const result = await gsx.execute(
      <Provider>
        <Component />
      </Provider>,
    );

    expect(result).toBe("bar");
  });

  test("can add to the context with a function child", async () => {
    const Provider = gsx.Provider(() => {
      return { foo: "bar" };
    });

    const Component = gsx.Component<Record<string, never>, string>(async () => {
      const context = getCurrentContext();
      await setTimeout(0);
      const foo = context.get("foo");
      if (!foo) {
        throw new Error("foo is not set");
      }
      return foo;
    });

    const result = await gsx.execute(
      <Provider>{() => <Component />}</Provider>,
    );

    expect(result).toBe("bar");
  });
});
