import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import * as gensx from "@/index.js";

suite("jsx-runtime", () => {
  test("can create element from component", async () => {
    const MyComponent = gensx.Component<{}, string>("MyComponent", async () => {
      await setTimeout(0);
      return "test";
    });

    const result = await gensx.execute(<MyComponent />);
    expect(result).toBe("test");
  });

  test("can create element from component with children", async () => {
    const MyComponent = gensx.Component<{}, string>("MyComponent", async () => {
      await setTimeout(0);
      return "test";
    });

    const result = await gensx.execute(
      <MyComponent>
        {async (value) => {
          await setTimeout(0);
          return value + " world";
        }}
      </MyComponent>,
    );
    expect(result).toBe("test world");
  });

  test("child does not receive children prop", async () => {
    let childReceivedProps: Record<string, unknown> | undefined = undefined;

    const Child = gensx.Component<{}, string>("Child", (props) => {
      childReceivedProps = props;
      return "child";
    });

    const Parent = gensx.Component<{}, string>("Parent", async () => {
      return await gensx.execute(
        <Child>{(val: string) => val + " extra"}</Child>,
      );
    });

    await gensx.execute(<Parent />);

    expect(childReceivedProps).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    expect((childReceivedProps as any)?.children).toBeUndefined();
  });
});
