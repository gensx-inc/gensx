import { setTimeout } from "timers/promises";

import { gsx } from "@/index";

suite("jsx-runtime", () => {
  test("Fragment handles single child correctly", async () => {
    const Component = gsx.Component<Record<string, never>, string>(async () => {
      await setTimeout(0);
      return "test";
    });
    const result = await gsx.execute(
      <>
        <Component />
      </>,
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(["test"]);
  });
});
