import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { gsx } from "@/index.js";

suite("component", () => {
  test("can create anonymous component", async () => {
    const AnonymousComponent = gsx.Component<{}, string>(
      "AnonymousComponent",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const result = await gsx.execute(<AnonymousComponent />);
    expect(result).toBe("hello");
  });

  test("can create named component", async () => {
    const NamedComponent = gsx.Component<{}, string>(
      "NamedComponent",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const result = await gsx.execute(<NamedComponent />);
    expect(result).toBe("hello");
  });
});
