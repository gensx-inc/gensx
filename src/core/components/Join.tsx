import React from "react";
import {
  createWorkflow,
  WorkflowComponent,
  WorkflowComponentProps,
} from "../utils/workflow-builder";
import { createWorkflowOutput } from "../hooks/useWorkflowOutput";

interface JoinProps<TItem, TOutput> {
  items: TItem[];
  map: (item: TItem) => React.ReactElement;
  children: (results: TOutput[]) => React.ReactElement | null;
  concurrency?: "parallel" | "sequential" | number;
}

export function Join<TItem, TOutput>(
  props: JoinProps<TItem, TOutput>
): React.ReactElement {
  const WorkflowComponent = createWorkflow<
    JoinProps<TItem, TOutput>,
    TOutput[]
  >(async (workflowProps, render) => {
    const outputs: Promise<TOutput>[] = [];

    const mappedElements = workflowProps.items.map((item, index) => {
      const [output, setOutput] = createWorkflowOutput<TOutput>(null as any);
      outputs.push(output);

      const element = workflowProps.map(item);
      return React.cloneElement(element, {
        ...element.props,
        setOutput,
        key: `join-item-${index}`,
      });
    });

    Promise.all(outputs).then((results) => {
      render(results);
    });
    return <React.Fragment>{mappedElements}</React.Fragment>;
  });

  return <WorkflowComponent {...props} />;
}
