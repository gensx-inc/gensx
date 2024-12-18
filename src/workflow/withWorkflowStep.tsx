import { MaybePromise } from "../jsx-runtime";
import { executeJsxWorkflow } from "./execute";

export function withWorkflowFunction<TInput extends Record<string, unknown>>(
  fn: (input: TInput) => MaybePromise<string>,
) {
  function WorkflowFunction(
    props: TInput & { children?: (output: string) => MaybePromise<string> },
  ): Promise<string> {
    return Promise.resolve(fn(props));
  }
  return WorkflowFunction;
}

// For wrapping JSX trees that need execution
export function withWorkflowComponent<TInput extends Record<string, unknown>>(
  component: (input: TInput) => MaybePromise<string>,
) {
  console.log("withWorkflowComponent", { component });
  async function WorkflowComponent(
    input: TInput & { children?: (output: string) => MaybePromise<string> },
  ): Promise<string> {
    console.log("withWorkflowComponent call ", { component, input });
    const element = Promise.resolve(component(input));
    const result = await executeJsxWorkflow(element);
    console.log("withWorkflowComponent result", result);
    return result;
  }
  return WorkflowComponent;
}
