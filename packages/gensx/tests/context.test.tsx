import { setTimeout } from "timers/promises";

import type { WorkflowContext } from "@/types";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCurrentContext, withContext } from "@/context";
import { gsx } from "@/index";

// Extend WorkflowContext for our test cases
interface TestContext extends WorkflowContext {
  value?: string;
  streaming?: boolean;
  foo?: string;
  a?: number;
  b?: number;
  c?: number;
}

// Helper component for testing context
const ContextReader = gsx.Component<Record<string, never>, string>(() => {
  const ctx = getCurrentContext();
  return ctx.get("value") as string;
});

describe("context", () => {
  test("forked context maintains independent state", async () => {
    const Component = gsx.Component<Record<string, never>, string>(async () => {
      const ctx = getCurrentContext();
      await setTimeout(0);
      const fork = ctx.fork();
      fork.withContext({ streaming: true });
      expect(ctx.context.streaming).toBe(undefined);
      return "";
    });
    await gsx.execute(<Component />);
  });

  test("child context inherits values from parent", async () => {
    const Component = gsx.Component<Record<string, never>, string>(async () => {
      const ctx = getCurrentContext();
      await setTimeout(0);
      const parent = ctx.withContext({ streaming: true });
      const child = parent.withContext({ foo: "bar" });
      expect(child.get("streaming")).toBe(true);
      expect(child.get("foo")).toBe("bar");
      return "";
    });
    await gsx.execute(<Component />);
  });

  describe("withContext", () => {
    test("maintains context during async operations", async () => {
      const values: string[] = [];

      await withContext({ value: "outer" } satisfies Partial<TestContext>, {
        execute: async () => {
          values.push(await gsx.execute(<ContextReader />));
          await setTimeout(0);
          values.push(await gsx.execute(<ContextReader />));

          await withContext({ value: "inner" } satisfies Partial<TestContext>, {
            execute: async () => {
              values.push(await gsx.execute(<ContextReader />));
              await setTimeout(0);
              values.push(await gsx.execute(<ContextReader />));
            },
          });

          values.push(await gsx.execute(<ContextReader />));
        },
      });

      expect(values).toEqual(["outer", "outer", "inner", "inner", "outer"]);
    });

    test("restores context after error", async () => {
      const initialValue = getCurrentContext().get("value");

      try {
        await withContext(
          { value: "test" } satisfies Partial<TestContext>,
          () => Promise.reject(new Error("test error")),
        );
      } catch {
        // Ignore error
      }

      expect(getCurrentContext().get("value")).toBe(initialValue);
    });

    test("supports concurrent operations", async () => {
      const results: string[] = [];

      await Promise.all([
        withContext({ value: "1" } satisfies Partial<TestContext>, {
          execute: async () => {
            await setTimeout(10);
            results.push(await gsx.execute(<ContextReader />));
          },
        }),
        withContext({ value: "2" } satisfies Partial<TestContext>, {
          execute: async () => {
            await setTimeout(5);
            results.push(await gsx.execute(<ContextReader />));
          },
        }),
        withContext({ value: "3" } satisfies Partial<TestContext>, {
          execute: async () => {
            results.push(await gsx.execute(<ContextReader />));
          },
        }),
      ]);

      // Order might vary but all values should be present
      expect(results.sort()).toEqual(["1", "2", "3"]);
    });

    test("empty context does not create new context", async () => {
      const ctx1 = getCurrentContext();
      const Component = gsx.Component(() => {
        const ctx2 = getCurrentContext();
        expect(ctx2).toBe(ctx1);
      });
      await withContext({} satisfies Partial<TestContext>, <Component />);
    });

    test("nested contexts maintain proper hierarchy", async () => {
      const Component1 = gsx.Component(() => {
        expect(getCurrentContext().get("a")).toBe(1);
      });
      const Component2 = gsx.Component(() => {
        expect(getCurrentContext().get("a")).toBe(1);
        expect(getCurrentContext().get("b")).toBe(2);
      });
      const Component3 = gsx.Component(() => {
        expect(getCurrentContext().get("a")).toBe(1);
        expect(getCurrentContext().get("b")).toBe(2);
        expect(getCurrentContext().get("c")).toBe(3);
      });
      await withContext(
        { a: 1 } satisfies Partial<TestContext>,
        <Component1>
          {async () => {
            await withContext(
              { b: 2 } satisfies Partial<TestContext>,
              <Component2>
                {async () => {
                  await withContext(
                    { c: 3 } satisfies Partial<TestContext>,
                    <Component3 />,
                  );

                  expect(getCurrentContext().get("c")).toBe(undefined);
                }}
              </Component2>,
            );
            expect(getCurrentContext().get("b")).toBe(undefined);
          }}
        </Component1>,
      );
    });
  });
});

// Browser environment tests
describe("context in browser environment", () => {
  beforeEach(() => {
    // Clear module cache to ensure fresh imports
    vi.resetModules();

    // Mock require to fail for node:async_hooks
    vi.mock("node:async_hooks", () => {
      throw new Error("Cannot find module node:async_hooks");
    });
  });

  afterEach(() => {
    vi.unmock("node:async_hooks");
  });

  test("maintains context in concurrent operations using global fallback", async () => {
    const { withContext } = await import("@/context");
    const { gsx } = await import("@/index");

    const results: string[] = [];
    const delays = [30, 20, 10]; // Different delays to ensure interleaving

    const ContextReader = gsx.Component<Record<string, never>, string>(
      async () => {
        const ctx = (await import("@/context")).getCurrentContext();
        return ctx.get("value") as string;
      },
    );

    const Component = gsx.Component<{ delay: number }, null>(
      async ({ delay }) => {
        await setTimeout(delay);
        results.push(await gsx.execute(<ContextReader />));
        return null;
      },
    );

    await Promise.all(
      delays.map((delay, i) =>
        withContext(
          { value: `value${i}` } satisfies Partial<TestContext>,
          <Component delay={delay} />,
        ),
      ),
    );

    // Results should match the execution order based on delays
    expect(results).toEqual(["value2", "value1", "value0"]);
  });

  test("context isolation works in browser environment", async () => {
    const { withContext } = await import("@/context");
    const { gsx } = await import("@/index");

    const ContextReader = gsx.Component<Record<string, never>, string>(
      async () => {
        const ctx = (await import("@/context")).getCurrentContext();
        return ctx.get("value") as string;
      },
    );

    const values: string[] = [];

    await withContext(
      { value: "browser-outer" } satisfies Partial<TestContext>,
      {
        execute: async () => {
          values.push(await gsx.execute(<ContextReader />));

          await withContext(
            { value: "browser-inner" } satisfies Partial<TestContext>,
            {
              execute: async () => {
                values.push(await gsx.execute(<ContextReader />));
              },
            },
          );

          values.push(await gsx.execute(<ContextReader />));
        },
      },
    );

    expect(values).toEqual(["browser-outer", "browser-inner", "browser-outer"]);
  });

  test("error handling preserves context in browser environment", async () => {
    const { withContext } = await import("@/context");
    const { gsx } = await import("@/index");

    const ContextReader = gsx.Component<Record<string, never>, string>(
      async () => {
        const ctx = (await import("@/context")).getCurrentContext();
        return ctx.get("value") as string;
      },
    );

    const values: string[] = [];

    await withContext({ value: "start" } satisfies Partial<TestContext>, {
      execute: async () => {
        values.push(await gsx.execute(<ContextReader />));

        try {
          await withContext(
            { value: "error" } satisfies Partial<TestContext>,
            () => Promise.reject(new Error("test error")),
          );
        } catch {
          // Expected error
        }

        values.push(await gsx.execute(<ContextReader />));
      },
    });

    expect(values).toEqual(["start", "start"]);
  });
});
