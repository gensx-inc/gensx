import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { gsx, Streamable } from "../src";
import { executeWorkflowWithCheckpoints } from "./utils/executeWithCheckpoints";

type Assert<T, U> =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2
    ? true
    : { error: "Types are not equal"; type1: T; type2: U };

suite("execute", () => {
  const WorkflowComponent = gsx.Component("test", async () => {
    await setTimeout(0);
    return "hello";
  });

  suite("workflow", () => {
    test("can execute a workflow", async () => {
      const workflow = gsx.Workflow("test", WorkflowComponent);
      const result = await workflow.run({});

      const assertReturnType: Assert<typeof result, string> = true;

      expect(result).toBe("hello");
      expect(assertReturnType).toBe(true);
    });

    test("can execute a workflow with a stream component", async () => {
      const StreamComponent = gsx.StreamComponent<{ foo: string }>(
        "test",
        props => {
          const generator = async function* () {
            await setTimeout(0);
            yield props.foo;
          };
          return generator();
        },
      );

      // Using type annotations on the workflow call to ensure the correct type is returned
      const workflow = gsx.Workflow("test", StreamComponent);
      const iterator: Streamable = await workflow.run({
        stream: true,
        foo: "hello",
      });
      let result = "";
      for await (const chunk of iterator) {
        result += chunk;
      }
      expect(result).toBe("hello");

      const assertIteratorReturnType: Assert<typeof iterator, Streamable> =
        true;
      expect(assertIteratorReturnType).toBe(true);

      const stringResult: string = await workflow.run({
        stream: false,
        foo: "hello",
      });
      expect(stringResult).toBe("hello");

      const assertStringResultReturnType: Assert<typeof stringResult, string> =
        true;
      expect(assertStringResultReturnType).toBe(true);

      const stringResult2: string = await workflow.run({ foo: "hello" });
      expect(stringResult2).toBe("hello");

      const assertStringResult2ReturnType: Assert<
        typeof stringResult2,
        string
      > = true;
      expect(assertStringResult2ReturnType).toBe(true);
    });

    test("can run workflows in parallel", async () => {
      const result1 = executeWorkflowWithCheckpoints(<WorkflowComponent />, {
        num: "1",
      });
      const result2 = executeWorkflowWithCheckpoints(<WorkflowComponent />, {
        num: "2",
      });

      const [r1, r2] = await Promise.all([result1, result2]);
      expect(r1.result).toBe("hello");
      expect(r2.result).toBe("hello");

      // There is a race conditon (because of the way we mock fetch to capture checkpoints), so either r1 or r2 will have 2 checkpoints and the other will have 0.
      let checkpoints: typeof r1.checkpoints;
      if (Object.keys(r1.checkpoints).length > 0) {
        checkpoints = r1.checkpoints;
      } else {
        checkpoints = r2.checkpoints;
      }
      expect(Object.keys(checkpoints).length).toBeGreaterThanOrEqual(2);
      expect(
        Object.values(checkpoints).some(c => c.metadata?.num === "1"),
      ).toBe(true);
      expect(
        Object.values(checkpoints).some(c => c.metadata?.num === "2"),
      ).toBe(true);
    });

    test("sets the workflow name on the root node", async () => {
      const result = await executeWorkflowWithCheckpoints(
        <WorkflowComponent />,
      );
      expect(result.result).toBe("hello");
      expect(Object.keys(result.checkpoints).length).toBeGreaterThan(0);

      // The executeWorkflowWithCheckpoints helper sets the workflow name to be something like executeWorkflowWithCheckpoints1
      expect(Object.values(result.checkpoints)[0].componentName).toMatch(
        /executeWorkflowWithCheckpoints\d+/,
      );
    });
  });

  suite("execute", () => {
    test("can execute a component", async () => {
      const result = await gsx.execute(<WorkflowComponent />);
      expect(result).toBe("hello");
    });
  });
});
