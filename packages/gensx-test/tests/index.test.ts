import * as gensx from "@gensx/core";
import { testComponentRunner } from "src/index.js";
import { expect, it, suite } from "vitest";

const nestedComponent = gensx.Component(
  "NestedComponent",
  ({ input }: { input: string }) => {
    return input.toUpperCase();
  },
);

const testComponent = gensx.Component(
  "TestComponent",
  ({ input }: { input: string }) => {
    return nestedComponent({ input });
  },
);

suite("index", () => {
  it("should capture output and progress events", async () => {
    const { output, progressEvents } = await testComponentRunner(
      testComponent,
      {
        input: "hello",
      },
    );
    g;
    expect(output).toBe("HELLO");
    expect(progressEvents).toHaveLength(8);
  });
});
