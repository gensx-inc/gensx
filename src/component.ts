import { ComponentProps, MaybePromise, WorkflowComponent } from "./types";
import { JSX } from "./jsx-runtime";

export function Component<P, O>(
  fn: (props: P) => MaybePromise<O | JSX.Element | JSX.Element[]>,
): WorkflowComponent<P, O> {
  function WorkflowFunction(props: ComponentProps<P, O>): MaybePromise<O> {
    return Promise.resolve(fn(props)) as Promise<O>;
  }

  if (fn.name) {
    Object.defineProperty(WorkflowFunction, "name", {
      value: `WorkflowFunction[${fn.name}]`,
    });
  }

  // Mark as workflow component and JSX element type
  const component = WorkflowFunction as WorkflowComponent<P, O>;
  component.isWorkflowComponent = true;

  return component;
}
