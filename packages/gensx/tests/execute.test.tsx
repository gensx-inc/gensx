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
        (props) => {
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
      let workflowNames: typeof r1.workflowNames;
      if (r1.workflowNames.size > 0) {
        workflowNames = r1.workflowNames;
      } else {
        workflowNames = r2.workflowNames;
      }
      expect(workflowNames.size).toBeGreaterThanOrEqual(2);
      expect(
        Object.values(checkpoints).some((c) => c.metadata?.num === "1"),
      ).toBe(true);
      expect(
        Object.values(checkpoints).some((c) => c.metadata?.num === "2"),
      ).toBe(true);
      expect(
        Array.from(workflowNames).every((wn) =>
          /executeWorkflowWithCheckpoints\d+/.exec(wn),
        ),
      ).toBe(true);
    });

    test("requires workflow props to be an object", async () => {
      // @ts-expect-error - props is an array
      const ArrayPropsComponent = gsx.Component<string[], string[]>(
        "ArrayPropsComponent",
        (props) => {
          return props;
        },
      );

      const workflow = gsx.Workflow("test", ArrayPropsComponent);

      try {
        await workflow.run([]);
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component ArrayPropsComponent received non-object props.",
        );
      }

      // @ts-expect-error - props is a string
      const StringPropsComponent = gsx.Component<string, string>(
        "StringPropsComponent",
        (props) => {
          return props;
        },
      );

      const workflow2 = gsx.Workflow("test", StringPropsComponent);

      try {
        await workflow2.run("hello");
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component StringPropsComponent received non-object props.",
        );
      }

      // @ts-expect-error - props is a number
      const NumberPropsComponent = gsx.Component<number, number>(
        "NumberPropsComponent",
        (props) => {
          return props;
        },
      );

      const workflow3 = gsx.Workflow("test", NumberPropsComponent);

      try {
        await workflow3.run(1);
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component NumberPropsComponent received non-object props.",
        );
      }

      // @ts-expect-error - props is a boolean
      const BooleanPropsComponent = gsx.Component<boolean, boolean>(
        "BooleanPropsComponent",
        (props) => {
          return props;
        },
      );

      const workflow4 = gsx.Workflow("test", BooleanPropsComponent);

      try {
        await workflow4.run(true);
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component BooleanPropsComponent received non-object props.",
        );
      }

      // @ts-expect-error - props is a symbol
      const SymbolPropsComponent = gsx.Component<symbol, symbol>(
        "SymbolPropsComponent",
        (props) => {
          return props;
        },
      );

      const workflow5 = gsx.Workflow("test", SymbolPropsComponent);

      try {
        await workflow5.run(Symbol("test"));
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component SymbolPropsComponent received non-object props.",
        );
      }

      // @ts-expect-error - props is a function
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const FunctionPropsComponent = gsx.Component<Function, Function>(
        "FunctionPropsComponent",
        (props) => {
          return props;
        },
      );

      const workflow6 = gsx.Workflow("test", FunctionPropsComponent);

      try {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        await workflow6.run(() => {});
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component FunctionPropsComponent received non-object props.",
        );
      }

      // @ts-expect-error - props is a null
      const NullPropsComponent = gsx.Component<null, null>(
        "NullPropsComponent",
        (props) => {
          return props;
        },
      );

      const workflow7 = gsx.Workflow("test", NullPropsComponent);

      try {
        await workflow7.run(null as never);
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component NullPropsComponent received non-object props.",
        );
      }

      // @ts-expect-error - props is a undefined
      const UndefinedPropsComponent = gsx.Component<undefined, undefined>(
        "UndefinedPropsComponent",
        (props) => {
          return props;
        },
      );

      const workflow8 = gsx.Workflow("test", UndefinedPropsComponent);

      try {
        await workflow8.run(undefined as never);
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component UndefinedPropsComponent received non-object props.",
        );
      }

      // @ts-expect-error - props is a bigint
      const BigIntPropsComponent = gsx.Component<bigint, bigint>(
        "BigIntPropsComponent",
        (props) => {
          return props;
        },
      );

      const workflow9 = gsx.Workflow("test", BigIntPropsComponent);

      try {
        await workflow9.run(BigInt(1));
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component BigIntPropsComponent received non-object props.",
        );
      }
    });
  });

  suite("execute", () => {
    test("can execute a component", async () => {
      const result = await gsx.execute(<WorkflowComponent />);
      expect(result).toBe("hello");
    });
  });
});
