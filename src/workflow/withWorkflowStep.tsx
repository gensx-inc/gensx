import { Component, MaybePromise } from "../jsx-runtime";
import { executeJsxWorkflow } from "./execute";

export function withWorkflowFunction<
  TInput extends Record<string, unknown>,
  TOutput,
>(fn: (input: TInput) => MaybePromise<TOutput>) {
  function WorkflowFunction(props: TInput): Component<TOutput, TInput> {
    return {
      type: fn,
      props,
    };
  }
  return WorkflowFunction;
}

// For wrapping JSX trees that need execution
export function withWorkflowComponent<
  TInput extends Record<string, unknown>,
  TOutput,
>(component: Component<TOutput, TInput>) {
  console.log("withWorkflowComponent", { component });
  async function WorkflowComponent<ChildOutput = TOutput>({
    children,
    ...input
  }: TInput & { children?: (output: TOutput) => ChildOutput }): Promise<
    ChildOutput | TOutput
  > {
    console.log("withWorkflowComponent call ", { component, input, children });
    const element = component.type(input as TInput);
    const result = await executeJsxWorkflow(element);
    console.log("result", result);
    return children ? children(result) : result;
  }
  return WorkflowComponent;
}
