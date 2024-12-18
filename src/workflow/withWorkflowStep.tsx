import { MaybePromise } from "../jsx-runtime";
import { executeJsxWorkflow } from "./execute";

export function withWorkflowFunction<
  TOutput,
  TInput extends Record<string, unknown> = Record<string, unknown>,
>(fn: (input: TInput) => MaybePromise<TOutput>) {
  function WorkflowFunction(
    props: TInput & {
      children?: (output: TOutput) => MaybePromise<TOutput> | JSX.Element;
    },
  ): Promise<TOutput> {
    return Promise.resolve(fn(props));
  }
  return WorkflowFunction;
}

// For wrapping JSX trees that need execution
export function withWorkflowComponent<
  TOutput,
  TInput extends Record<string, unknown>,
>(component: (input: TInput) => MaybePromise<TOutput> | JSX.Element) {
  console.log("withWorkflowComponent", { component });
  async function WorkflowComponent(
    input: TInput & {
      children?: (output: TOutput) => MaybePromise<TOutput> | JSX.Element;
    },
  ): Promise<TOutput> {
    console.log("withWorkflowComponent call ", { component, input });
    const element = Promise.resolve(component(input));
    const result = await executeJsxWorkflow(element);
    console.log("withWorkflowComponent result", result);
    return result as TOutput;
  }
  return WorkflowComponent;
}
