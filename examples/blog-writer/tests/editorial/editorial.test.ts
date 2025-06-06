import * as gensx from "@gensx/core";
import { it, suite } from "vitest";

import { Editorial } from "../../src/components/editorial.js";

const testComponentRunner = async <P extends object, O>(
  component: gensx.ComponentFn<P, O>,
  props: P,
) => {
  const workflow = gensx.Workflow("TestComponentWorkflow", (props: P) => {
    return component(props);
  });

  const progressEvents: gensx.ProgressEvent[] = [];
  const output = await workflow(props, {
    progressListener: (event) => {
      progressEvents.push(event);
    },
  });

  return { output, progressEvents };
};

suite(
  "editorial",
  () => {
    it("should be able to generate an editorial", async () => {
      const { output, progressEvents } = await testComponentRunner(Editorial, {
        title: "Test Title",
        prompt: "Test Prompt",
        draft: "Test Draft",
        targetWordCount: 100,
      });

      console.log(output);
      console.log(progressEvents);
    });
  },
  30000,
);
