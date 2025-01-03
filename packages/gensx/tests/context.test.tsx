import { setTimeout } from "timers/promises";

import { getCurrentContext } from "@/context";
import { gsx } from "@/index";

suite("context", () => {
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
});
