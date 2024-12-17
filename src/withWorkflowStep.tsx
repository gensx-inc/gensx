import { ComponentChild } from "preact";

import { executeJsxWorkflow } from "./execute";

type MaybePromise<T> = T | Promise<T>;

// For wrapping pure functions into components
export function withWorkflowFunction<TInput extends object, TOutput>(
  fn: (input: TInput) => MaybePromise<TOutput>,
) {
  return ({
    children,
    ...input
  }: TInput & { children?: (output: TOutput) => ComponentChild }): Promise<
    ComponentChild | TOutput
  > => {
    const promise = fn(input as TInput);
    return Promise.resolve(promise).then((result: TOutput) =>
      children ? children(result) : result,
    );
  };
}

// For wrapping JSX trees that need execution
export function withWorkflowComponent<TInput extends object, TOutput>(
  component: (input: TInput) => ComponentChild,
) {
  return async ({
    children,
    ...input
  }: TInput & { children?: (output: TOutput) => ComponentChild }): Promise<
    ComponentChild | TOutput
  > => {
    const element = component(input as TInput);
    const result = await executeJsxWorkflow<TOutput>(element);
    return children ? children(result) : result;
  };
}
