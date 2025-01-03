import { setTimeout } from "timers/promises";

import { gsx } from "@/index";

suite("component", () => {
  test("ContextProvider warns when no children provided", async () => {
    const mockConsoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const Provider = gsx.Provider<Record<string, never>, { test: string }>(
      async () => {
        await setTimeout(0);
        return { test: "value" };
      },
    );
    await gsx.execute(<Provider />);
    await setTimeout(0);
    expect(mockConsoleWarn).toHaveBeenCalledWith("Provider has no children");
    mockConsoleWarn.mockRestore();
  });

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

  test("ContextProvider preserves name for named functions", async () => {
    async function namedFn() {
      await setTimeout(0);
      return { test: true };
    }
    const NamedProvider = gsx.Provider(namedFn);
    await setTimeout(0);
    expect(NamedProvider.name).toBe("GsxContextProvider[namedFn]");
  });
});
