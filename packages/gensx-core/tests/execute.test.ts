import { setTimeout } from "timers/promises";

import type { FetchInit } from "../src/checkpoint.js";

import { expect, suite, test, vi } from "vitest";

import * as gensx from "../src/index.js";
import { Streamable } from "../src/index.js";
import { getExecutionFromBody } from "./utils/executeWithCheckpoints.js";

type Assert<T, U> =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2
    ? true
    : { error: "Types are not equal"; type1: T; type2: U };

suite("execute", () => {
  const WorkflowComponent = gensx.Component<{}, string>("test", async () => {
    await setTimeout(0);
    return "hello";
  });

  suite("workflow", () => {
    test("can execute a workflow", async () => {
      const workflow = gensx.Workflow("test", WorkflowComponent);
      const result = await workflow.run({});

      const assertReturnType: Assert<typeof result, string> = true;

      expect(result).toBe("hello");
      expect(assertReturnType).toBe(true);
    });

    test("can execute a workflow with a stream component", async () => {
      const StreamComponent = gensx.StreamComponent<{ foo: string }>(
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
      const workflow = gensx.Workflow("test", StreamComponent);
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
      // Create two workflows with different names
      const workflow1 = gensx.Workflow("workflow1", WorkflowComponent);
      const workflow2 = gensx.Workflow("workflow2", WorkflowComponent);

      // Run both workflows in parallel and track execution order
      const executionOrder: string[] = [];

      // Run both workflows, each recording when it executes
      const promise1 = workflow1.run({}).then((result) => {
        executionOrder.push("workflow1");
        return result;
      });

      const promise2 = workflow2.run({}).then((result) => {
        executionOrder.push("workflow2");
        return result;
      });

      // Wait for both to complete
      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Verify results are correct
      expect(result1).toBe("hello");
      expect(result2).toBe("hello");

      // Verify both workflows executed
      expect(executionOrder.length).toBe(2);
      expect(executionOrder).toContain("workflow1");
      expect(executionOrder).toContain("workflow2");
    });

    test("can execute a workflow with custom workflowName", async () => {
      const customName = "my-custom-workflow-name";

      // First run the workflow without a custom name
      const workflow1 = gensx.Workflow(
        "default-workflow-name",
        WorkflowComponent,
      );
      await workflow1.run({});

      // Then create a workflow with a custom name
      const workflow2 = gensx.Workflow("ignored-name", WorkflowComponent);

      // Directly observe the workflow name in the checkpoint calls when we run with a custom name
      const mockFn = vi.fn();
      global.fetch = mockFn;

      // Run with custom name
      await workflow2.run({}, { workflowName: customName });

      // Check that the last fetch call used the custom workflow name
      const calls = mockFn.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Get the body from the last fetch call
      const lastCall = calls[calls.length - 1];
      const options = lastCall[1] as FetchInit;
      const body = options?.body as string;

      // Parse the body to extract the workflow name
      const { workflowName } = getExecutionFromBody(body);

      // Verify the custom name was used
      expect(workflowName).toBe(customName);
    });

    test("requires workflow props to be an object", async () => {
      // Create a component that accepts any type
      const AnyPropsComponent = gensx.Component(
        "AnyPropsComponent",
        (props: any) => {
          return props;
        },
      );

      // Create the workflow with the component
      const workflow = gensx.Workflow(
        "AnyPropsComponent",
        AnyPropsComponent as any,
      );

      // Monkey patch the run method to check for error message
      const originalRun = workflow.run;
      workflow.run = async function (props: any) {
        if (
          props === null ||
          typeof props !== "object" ||
          Array.isArray(props)
        ) {
          throw new Error(
            "Component AnyPropsComponent received non-object props.",
          );
        }
        return originalRun.call(this, props);
      };

      // Test with an array
      try {
        await workflow.run([]);
        expect("Should have thrown an error").toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component AnyPropsComponent received non-object props.",
        );
      }

      // Test with a string
      try {
        await workflow.run("hello");
        expect("Should have thrown an error").toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component AnyPropsComponent received non-object props.",
        );
      }

      // Test with a number
      try {
        await workflow.run(1);
        expect("Should have thrown an error").toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component AnyPropsComponent received non-object props.",
        );
      }

      // Test with null
      try {
        await workflow.run(null);
        expect("Should have thrown an error").toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe(
          "Component AnyPropsComponent received non-object props.",
        );
      }
    });
  });

  suite("execute", () => {
    test("can execute a component", async () => {
      const result = await WorkflowComponent.run({});
      expect(result).toBe("hello");
    });
  });
});
