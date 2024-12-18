import { isWorkflowComponent, WorkflowComponent } from "./component";

export type MaybePromise<T> = T | Promise<T>;

export async function gensx<
  TOutput,
  TProps extends Record<string, unknown>,
  TChildOutput,
>(
  component: WorkflowComponent<TOutput, TProps>,
  props: TProps,
  children: (output: TOutput) => MaybePromise<TChildOutput>,
): Promise<TChildOutput>;

export async function gensx<TOutput, TProps extends Record<string, unknown>>(
  component: WorkflowComponent<TOutput, TProps>,
  props: TProps,
): Promise<TOutput>;

export async function gensx<
  TOutput,
  TProps extends Record<string, unknown>,
  TChildOutput = TOutput,
>(
  component: WorkflowComponent<TOutput, TProps>,
  props: TProps,
  children?: (output: TOutput) => MaybePromise<TChildOutput>,
): Promise<TChildOutput | TOutput> {
  // Validate component
  if (!isWorkflowComponent(component)) {
    throw new Error("gensx must be called with a Component");
  }

  try {
    // Execute the component
    const result = await component(props);

    // If there's a children function, pass the result to it
    if (children) {
      return await Promise.resolve(children(result));
    }

    return result;
  } catch (error) {
    console.error("Error in workflow execution:", error);
    throw error;
  }
}
