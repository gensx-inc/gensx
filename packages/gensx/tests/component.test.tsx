import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { gsx } from "@/index.js";

suite("component", () => {
  test("Component preserves name for anonymous functions", async () => {
    const AnonymousComponent = gsx.Component(async () => {
      await setTimeout(0);
      return "test";
    });
    await setTimeout(0);
    expect(AnonymousComponent.name).toContain("GsxComponent");
  });

  test("Component preserves name for named functions", async () => {
    async function namedFn() {
      await setTimeout(0);
      return "test";
    }
    const NamedComponent = gsx.Component(namedFn);
    await setTimeout(0);
    expect(NamedComponent.name).toBe("GsxComponent[namedFn]");
  });

  test("StreamComponent preserves name for named functions", async () => {
    async function* namedFn() {
      await setTimeout(0);
      yield "test";
    }
    const NamedComponent = gsx.StreamComponent(namedFn);
    await setTimeout(0);
    expect(NamedComponent.name).toBe("GsxStreamComponent[namedFn]");
  });
});
