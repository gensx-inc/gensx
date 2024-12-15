import React from "react";
import { createWorkflow } from "../utils/workflow-builder";
import { createWorkflowOutput } from "../hooks/useWorkflowOutput";

// Helper type to extract the output type from a component
type ComponentOutput<T> = T extends React.ReactElement<{
  setOutput: (value: infer R) => void;
}>
  ? R
  : never;

interface MapProps<
  TItem,
  TElement extends React.ReactElement<{ setOutput: (value: any) => void }>
> {
  items: TItem[];
  map: (item: TItem) => TElement;
  children?: (
    results: ComponentOutput<TElement>[]
  ) => React.ReactElement | null;
}

export function Map<
  TItem,
  TElement extends React.ReactElement<{ setOutput: (value: any) => void }>
>(props: MapProps<TItem, TElement>): React.ReactElement {
  const WorkflowComponent = createWorkflow<
    MapProps<TItem, TElement>,
    ComponentOutput<TElement>[]
  >(async (workflowProps, render) => {
    const outputs: Promise<ComponentOutput<TElement>>[] = [];

    // Create mapped elements with output collectors
    const mappedElements = workflowProps.items.map((item) => {
      const [output, setOutput] = createWorkflowOutput<
        ComponentOutput<TElement>
      >(null as any);
      outputs.push(output);

      const element = workflowProps.map(item);
      return React.cloneElement(element, { setOutput });
    });

    Promise.all(outputs).then((results) => {
      render(results);
    });
    return <React.Fragment>{mappedElements}</React.Fragment>;
  });

  return <WorkflowComponent {...props} />;
}
