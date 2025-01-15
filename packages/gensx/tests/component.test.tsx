import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { gsx } from "@/index.js";
import { Component } from "@/types";

suite("component", () => {
  test("can create anonymous component", async () => {
    const AnonymousComponent: Component<
      Record<string, never>,
      string
    > = async () => {
      await setTimeout(0);
      return "hello";
    };

    const result = await gsx.execute(<AnonymousComponent />);
    expect(result).toBe("hello");
  });

  test("can create named component", async () => {
    async function namedFn(): Promise<string> {
      await setTimeout(0);
      return "hello";
    }

    const NamedComponent: Component<Record<string, never>, string> = namedFn;

    const result = await gsx.execute(<NamedComponent />);
    expect(result).toBe("hello");
  });
});
