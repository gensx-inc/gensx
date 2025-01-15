import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { gsx } from "@/index.js";
import { ComponentProps } from "@/types";

suite("component", () => {
  test("can create anonymous component", async () => {
    const AnonymousComponent = async (_: ComponentProps<{}, string>) => {
      await setTimeout(0);
      return "hello";
    };

    const result = await gsx.execute(<AnonymousComponent />);
    expect(result).toBe("hello");
  });

  test("can create named component", async () => {
    async function NamedComponent(_: ComponentProps<{}, string>) {
      await setTimeout(0);
      return "hello";
    }

    const result = await gsx.execute(<NamedComponent />);
    expect(result).toBe("hello");
  });
});
