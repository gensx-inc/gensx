import { Component } from "./component.js";
import { getCurrentContext } from "./context.js";

// TODO: Is there a security issue here? Does this endpoint need to be authenticated?
function getCallbackUrl(nodeId: string) {
  return `${process.env.GENSX_API_BASE_URL}/org/${process.env.GENSX_ORG}/workflowExecutions/${process.env.GENSX_EXECUTION_ID}/resume/${nodeId}`;
}

// TODO: Name this better
export async function waitForInput<T extends Record<string, unknown>>(
  trigger: (callbackUrl: string) => Promise<void>,
  // schema: z.ZodSchema<T>, // TODO
): Promise<T> {
  // TODO: We should do some locking here to prevent multiple simultaneous waitForInput calls.
  const TriggerComponent = Component(
    "WaitForInputTrigger",
    async ({ nodeId }: { nodeId: string }) => {
      await trigger(getCallbackUrl(nodeId));
    },
  );

  // This is a magical component that, upon resume, will have the expected output in the checkpoint, filled in by the cloud runtime when the /resume endpoint is called.
  // We define this inside the waitForInput function so that it can reference the trigger function _without_ it being passed in as an argument.
  const WaitForInputComponent = Component("WaitForInput", async () => {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const currentNodeId = context.getCurrentNodeId();
    if (!currentNodeId) {
      throw new Error("No current node ID found");
    }
    await TriggerComponent({ nodeId: currentNodeId });

    // Ensure that the we have flushed all pending updates to the server.
    await workflowContext.checkpointManager.waitForPendingUpdates();

    // This is where the magic happens 🪄
    await workflowContext.onWaitForInput(currentNodeId);

    // Log an error here, because this bit of code should never actually be executed.
    console.error("[GenSX] Pause/resume not supported in this environment");
    return {};
  });

  return (await WaitForInputComponent()) as T;
}
