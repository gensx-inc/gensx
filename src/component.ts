import { JSX, MaybePromise } from "./jsx-runtime";

export function Component<TInput extends Record<string, unknown>, TOutput>(
  fn: (input: TInput) => MaybePromise<TOutput> | JSX.Element,
) {
  function WorkflowFunction(
    props: TInput & {
      children?: (output: TOutput) => MaybePromise<TOutput> | JSX.Element;
    },
  ): Promise<TOutput> {
    return Promise.resolve(fn(props)) as Promise<TOutput>;
  }
  return WorkflowFunction;
}
