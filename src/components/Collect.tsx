/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import { createWorkflowOutput } from "../hooks/useWorkflowOutput";
import { createWorkflow } from "../utils/workflowBuilder";

export function createCollector<T>() {
  const [output, setOutput] = createWorkflowOutput<T[]>([]);

  const CollectorComponent = createWorkflow<
    {
      children: () => React.ReactElement[];
    },
    T[]
  >((props, render) => {
    const rawChildren = props.__rawChildren as
      | (() => React.ReactElement[])
      | undefined;
    if (!rawChildren) {
      throw new Error("Collector requires a children function");
    }

    const elements = rawChildren();
    const outputs: Promise<T>[] = [];

    const enhancedChildren = elements.map((child, index) => {
      const [childOutput, setChildOutput] = createWorkflowOutput<T>(
        null as any,
      );
      outputs.push(childOutput);

      return React.cloneElement(child, {
        ...child.props,
        setOutput: setChildOutput,
        key: index,
      });
    });

    Promise.all(outputs).then(results => {
      setOutput(results);
      render(results);
    });

    return <>{enhancedChildren}</>;
  });

  return [CollectorComponent, output] as const;
}
