import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { gsx } from "@/index.js";
import { Component } from "@/types";

suite("jsx-runtime", () => {
  test("can create element from component", async () => {
    const Component: Component<Record<string, never>, string> = async () => {
      await setTimeout(0);
      return "test";
    };

    const result = await gsx.execute(<Component />);
    expect(result).toBe("test");
  });

  test("can create element from component with children", async () => {
    const Component: Component<Record<string, never>, string> = async () => {
      await setTimeout(0);
      return "test";
    };

    const result = await gsx.execute(
      <Component>
        {async value => {
          await setTimeout(0);
          return value + " world";
        }}
      </Component>,
    );
    expect(result).toBe("test world");
  });
});
