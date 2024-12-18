export async function executeJsxWorkflow(
  node: Promise<string>,
): Promise<string> {
  console.log("executeJsxWorkflow", node);
  return await node;
}
