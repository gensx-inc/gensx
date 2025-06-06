import * as gensx from "@gensx/core";

export const testComponentRunner = async <P extends object, O>(
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
