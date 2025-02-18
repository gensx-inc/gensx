import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { gsx, Streamable } from "../src";

suite("execute", () => {
  const WorkflowComponent = gsx.Component("test", () => "hello");

  suite("workflow", () => {
    test("can execute a workflow", async () => {
      const workflow = gsx.workflow("test", WorkflowComponent);
      const result = await workflow.run({});
      expect(result).toBe("hello");
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
      const workflow = gsx.workflow("test", StreamComponent);
      const iterator: Streamable = await workflow.run({
        stream: true,
        foo: "hello",
      });
      let result = "";
      for await (const chunk of iterator) {
        result += chunk;
      }
      expect(result).toBe("hello");

      const stringResult: string = await workflow.run({
        stream: false,
        foo: "hello",
      });
      expect(stringResult).toBe("hello");

      const stringResult2: string = await workflow.run({ foo: "hello" });
      expect(stringResult2).toBe("hello");
    });
  });

  suite("execute", () => {
    test("can execute a component", async () => {
      const result = await gsx.execute(<WorkflowComponent />);
      expect(result).toBe("hello");
    });
  });
});
