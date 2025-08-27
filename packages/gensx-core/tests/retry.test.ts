import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { executeWorkflowWithCheckpoints } from "./utils/executeWithCheckpoints.js";

suite("retries", () => {
  test("succeeds on second attempt and records attempts + metadata", async () => {
    let calls = 0;
    const Flaky = gensx.Component(
      "Flaky",
      () => {
        calls += 1;
        if (calls < 2) {
          throw new Error("boom");
        }
        return "ok";
      },
      {
        retry: { enabled: true, maxTries: 3, strategy: "none" },
      },
    );

    const { result, checkpoints } = await executeWorkflowWithCheckpoints(() =>
      Flaky({} as never),
    );

    expect(result).toBe("ok");

    // Find the checkpoint tree that contains our component
    const trees = Object.values(checkpoints);
    const tree = trees.find((t) =>
      t.children.some((c) => c.componentName === "Flaky"),
    );
    expect(tree).toBeDefined();
    const componentNode = tree!.children.find(
      (c) => c.componentName === "Flaky",
    )!;

    expect(componentNode.metadata?.retry).toBeDefined();
    expect(componentNode.metadata?.retry).toMatchObject({
      enabled: true,
      maxTries: 3,
      strategy: "none",
    });
    // One failed attempt should be recorded
    const attemptNodes = componentNode.children.filter((c) =>
      c.componentName.includes("Attempt #"),
    );
    expect(attemptNodes.length).toBe(1);
    expect(attemptNodes[0].metadata).toMatchObject({
      status: "failed",
      attempt: 1,
    });
    // Parent completed successfully, output is serialized promise wrapper
    expect(componentNode.completed).toBe(true);
    const output = componentNode.output as {
      __gensxSerialized: boolean;
      type: string;
      value: unknown;
    };
    expect(typeof output).toBe("object");
    expect(output.__gensxSerialized).toBe(true);
    expect(output.type).toBe("promise");
    expect(output.value).toBe("ok");
  });

  test("exhausts retries then surfaces error with attempts recorded", async () => {
    const AlwaysFail = gensx.Component(
      "AlwaysFail",
      () => {
        throw new Error("nope");
      },
      { retry: { enabled: true, maxTries: 2, strategy: "none" } },
    );

    const { error, checkpoints } = await executeWorkflowWithCheckpoints(() =>
      AlwaysFail({} as never),
    );

    expect(error).toBeInstanceOf(Error);

    const trees = Object.values(checkpoints);
    const tree = trees.find((t) =>
      t.children.some((c) => c.componentName === "AlwaysFail"),
    );
    expect(tree).toBeDefined();
    const componentNode = tree!.children.find(
      (c) => c.componentName === "AlwaysFail",
    )!;

    // Two failed attempts recorded
    const attemptNodes = componentNode.children.filter((c) =>
      c.componentName.includes("Attempt #"),
    );
    expect(attemptNodes.length).toBe(2);
    for (let i = 0; i < attemptNodes.length; i++) {
      expect(attemptNodes[i].metadata).toMatchObject({
        status: "failed",
        attempt: i + 1,
      });
      expect(attemptNodes[i].completed).toBe(true);
    }

    // Parent completed with error metadata
    expect(componentNode.completed).toBe(true);
    expect(componentNode.metadata?.error).toBeDefined();
  });

  test("runtime retry options override and are respected", async () => {
    let calls = 0;
    const FlakyNoRetry = gensx.Component("FlakyNoRetry", () => {
      calls += 1;
      if (calls < 2) throw new Error("first fails");
      return "ok";
    });

    const { result, checkpoints } = await executeWorkflowWithCheckpoints(() =>
      FlakyNoRetry({} as never, {
        retry: { enabled: true, maxTries: 2, strategy: "none" },
      }),
    );

    expect(result).toBe("ok");

    const trees = Object.values(checkpoints);
    const tree = trees.find((t) =>
      t.children.some((c) => c.componentName === "FlakyNoRetry"),
    );
    expect(tree).toBeDefined();
    const componentNode = tree!.children.find(
      (c) => c.componentName === "FlakyNoRetry",
    )!;
    expect(componentNode.metadata?.retry).toMatchObject({
      enabled: true,
      maxTries: 2,
      strategy: "none",
    });
    const attemptNodes = componentNode.children.filter((c) =>
      c.componentName.includes("Attempt #"),
    );
    expect(attemptNodes.length).toBe(1);
  });
});
