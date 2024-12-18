export async function executeJsxWorkflow<TOutput>(
  node: JSX.Element,
): Promise<TOutput> {
  console.log("executeJsxWorkflow", node);
  return (await node) as TOutput;
}
