import { Component } from "./component.js";
import { getCurrentContext } from "./context.js";

export async function requestInput<T>(_message?: string): Promise<T> {
  // TODO: We should do some locking here to prevent multiple simultaneous requestInput calls.
  // This is a magical component that, upon resume, will have the expected output in the checkpoint, filled in by the cloud runtime when the /resume endpoint is called.
  const RequestInputComponent = Component("RequestInput", async () => {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const currentNode = context.getCurrentNode();
    if (!currentNode) {
      throw new Error("No current node ID found");
    }

    // Ensure that the we have flushed all pending updates to the server.
    await workflowContext.checkpointManager.waitForPendingUpdates();

    return (await workflowContext.onRequestInput({
      type: "input-request",
      nodeId: currentNode.id,
    })) as T;
  });

  return await RequestInputComponent();
}
