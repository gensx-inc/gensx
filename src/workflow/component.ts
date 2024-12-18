import { MaybePromise } from "./execute";

export type ComponentFunction<
  TOutput,
  TInput extends Record<string, unknown> = Record<string, unknown>,
> = (input: TInput) => MaybePromise<TOutput>;

export type WorkflowComponent<
  TOutput,
  TInput extends Record<string, unknown>,
> = (props: TInput) => Promise<TOutput>;

export function Component<TOutput, TInput extends Record<string, unknown>>(
  fn: ComponentFunction<TOutput, TInput>,
): WorkflowComponent<TOutput, TInput> {
  const WorkflowComponent = function (props: TInput): Promise<TOutput> {
    return Promise.resolve(fn(props));
  };

  // Add metadata to help with type checking and debugging
  WorkflowComponent.__isWorkflowComponent = true;
  WorkflowComponent.__originalFn = fn;

  return WorkflowComponent;
}

// Type guard to check if something is a workflow component
export function isWorkflowComponent(
  component: unknown,
): component is WorkflowComponent<unknown, Record<string, unknown>> {
  return (
    typeof component === "function" &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (component as any).__isWorkflowComponent === true
  );
}
