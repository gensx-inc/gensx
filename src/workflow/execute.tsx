import { Component } from "../jsx-runtime";

export type { Component };

export async function executeJsxWorkflow<TOutput, TInput>(
  node: Component<TOutput, TInput>,
): Promise<TOutput> {
  console.log("executeJsxWorkflow", node);
  const result = await node.type(node.props);
  if (typeof result === "object" && result !== null && "type" in result) {
    // If we got back another component, execute it
    return executeJsxWorkflow(result as any);
  }
  console.log("result", result);
  return result;
}
