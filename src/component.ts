import { JSX, MaybePromise } from "./jsx-runtime";

export function Component<TInput, TOutput>(
  fn: (input: TInput) => MaybePromise<TOutput> | JSX.Element,
) {
  function WorkflowFunction(
    props: TInput & {
      children?: (
        output: TOutput,
      ) => MaybePromise<TOutput | JSX.Element | JSX.Element[]>;
    },
  ): Promise<TOutput> {
    return Promise.resolve(fn(props)) as Promise<TOutput>;
  }
  if (fn.name) {
    Object.defineProperty(WorkflowFunction, "name", {
      value: `WorkflowFunction[${fn.name}]`,
    });
  }
  return WorkflowFunction;
}
